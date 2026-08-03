#!/bin/bash
# =============================================================================
# deploy.sh — MapNexus VPS Deployment Script
# รันบน VPS ด้วย: bash deploy.sh
# =============================================================================
set -e

# ---- ตั้งค่าตรงนี้ ----
DOMAIN="YOUR_DOMAIN.COM"
DEPLOY_DIR="/var/www/mapnexus"
GIT_REPO="https://github.com/YOUR_GITHUB_USERNAME/MapNexus.git"  # แก้ตรงนี้
# ----------------------

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }

echo ""
echo "======================================================"
echo "   MapNexus — VPS Deployment Script"
echo "======================================================"
echo ""

# ---- 1. ตรวจสอบ Dependencies ----
log "ตรวจสอบ Dependencies..."
command -v node  >/dev/null 2>&1 || err "ไม่พบ Node.js — ติดตั้งก่อน: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
command -v pm2   >/dev/null 2>&1 || err "ไม่พบ PM2 — ติดตั้งก่อน: npm install -g pm2"
command -v nginx >/dev/null 2>&1 || err "ไม่พบ Nginx — ติดตั้งก่อน: sudo apt install -y nginx"
log "Node.js: $(node -v) | PM2: $(pm2 -v) | Nginx: $(nginx -v 2>&1 | head -1)"

# ---- 2. Clone หรือ Pull โค้ด ----
if [ -d "$DEPLOY_DIR/.git" ]; then
    log "พบโปรเจกต์แล้ว — กำลัง git pull..."
    cd "$DEPLOY_DIR"
    git pull origin main
else
    log "Clone โปรเจกต์ใหม่..."
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown "$USER":"$USER" "$DEPLOY_DIR"
    git clone "$GIT_REPO" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# ---- 3. ติดตั้ง Backend Dependencies ----
log "ติดตั้ง Backend dependencies..."
cd "$DEPLOY_DIR/Backend"
npm install --omit=dev

# ---- 4. ตรวจสอบ .env ----
if [ ! -f "$DEPLOY_DIR/Backend/.env" ]; then
    warn "ไม่พบไฟล์ .env — กรุณาสร้างไฟล์ก่อน!"
    echo ""
    echo "  ทำตามขั้นตอนนี้:"
    echo "  1. cp $DEPLOY_DIR/Backend/.env.example $DEPLOY_DIR/Backend/.env"
    echo "  2. nano $DEPLOY_DIR/Backend/.env   (แก้ไขค่าให้ครบ)"
    echo "  3. รัน deploy.sh อีกครั้ง"
    echo ""
    exit 1
fi

# ตรวจสอบว่า .env มีค่าสำคัญครบ
check_env_key() {
    local key="$1"
    local val
    val=$(grep "^${key}=" "$DEPLOY_DIR/Backend/.env" | cut -d'=' -f2-)
    if [ -z "$val" ]; then
        warn ".env ขาดค่า $key"
    fi
}
check_env_key "FIREBASE_PRIVATE_KEY"
check_env_key "FIREBASE_PROJECT_ID"
check_env_key "JWT_SECRET"
check_env_key "GEMINI_API_KEY"

# ตรวจสอบว่า JWT_SECRET ไม่ใช่ค่า default
JWT_VAL=$(grep "^JWT_SECRET=" "$DEPLOY_DIR/Backend/.env" | cut -d'=' -f2-)
if [[ "$JWT_VAL" == "dev-only-insecure-secret-change-me" ]]; then
    err "JWT_SECRET ยังเป็นค่า default! เปลี่ยนก่อน: openssl rand -base64 64"
fi

# ---- 5. สร้าง uploads directory ----
log "สร้าง uploads directory..."
mkdir -p "$DEPLOY_DIR/Backend/uploads"
mkdir -p "$DEPLOY_DIR/.run"

# ---- 6. Setup Nginx ----
log "ตั้งค่า Nginx..."
sudo cp "$DEPLOY_DIR/nginx.conf.template" "/etc/nginx/sites-available/mapnexus"
# แทน placeholder ด้วย domain จริง
sudo sed -i "s/YOUR_DOMAIN.COM/$DOMAIN/g" "/etc/nginx/sites-available/mapnexus"
sudo sed -i "s|/var/www/mapnexus|$DEPLOY_DIR|g" "/etc/nginx/sites-available/mapnexus"

# เปิดใช้ site
if [ ! -f "/etc/nginx/sites-enabled/mapnexus" ]; then
    sudo ln -s /etc/nginx/sites-available/mapnexus /etc/nginx/sites-enabled/
fi

# ทดสอบ config
sudo nginx -t && log "Nginx config ถูกต้อง"

# ---- 7. ติดตั้ง SSL Certificate (Certbot) ----
if ! command -v certbot >/dev/null 2>&1; then
    warn "ไม่พบ Certbot — ติดตั้ง SSL..."
    sudo apt install -y certbot python3-certbot-nginx
fi

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log "ติดตั้ง SSL Certificate..."
    sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN"
else
    log "SSL Certificate มีอยู่แล้ว"
fi

# ---- 8. Start/Restart Backend ด้วย PM2 ----
log "Start Backend ด้วย PM2..."
cd "$DEPLOY_DIR"

if pm2 list | grep -q "mapnexus-backend"; then
    pm2 reload mapnexus-backend --update-env
    log "PM2 reloaded"
else
    pm2 start ecosystem.config.js --env production
    log "PM2 started"
fi

# บันทึก PM2 startup
pm2 save
pm2 startup | tail -1 | grep "sudo" | bash 2>/dev/null || true

# ---- 9. Reload Nginx ----
sudo systemctl reload nginx
log "Nginx reloaded"

# ---- 10. Health Check ----
echo ""
log "ตรวจสอบ Backend health..."
sleep 3
if curl -s --max-time 10 "http://127.0.0.1:4000/api/health" | grep -q '"status":"ok"'; then
    log "Backend API: สถานะปกติ ✅"
else
    warn "Backend ยังไม่พร้อม — ดู log: pm2 logs mapnexus-backend"
fi

# ---- Done ----
echo ""
echo "======================================================"
log "Deploy เสร็จสมบูรณ์!"
echo ""
echo "  Website:    https://$DOMAIN"
echo "  API Health: https://$DOMAIN/api/health"
echo "  PM2 Status: pm2 status"
echo "  PM2 Logs:   pm2 logs mapnexus-backend"
echo "======================================================"
