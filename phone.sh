ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---- Find this Mac's LAN IP (tries the common interface names) ----
LAN_IP=""
for iface in en0 en1 en2; do
  ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
  if [ -n "$ip" ]; then
    LAN_IP="$ip"
    break
  fi
done

if [ -z "$LAN_IP" ]; then
  echo "⚠️  หา IP ของเครื่องนี้ในเครือข่าย Wi-Fi ไม่เจอ"
  echo "   ตรวจสอบว่าเชื่อมต่อ Wi-Fi อยู่ แล้วลองรันใหม่"
  exit 1
fi

"$ROOT_DIR/start.sh"

PHONE_URL="http://$LAN_IP:8000/Fronend/index.html"

echo ""
echo "============================================================"
echo "📱 เอามือถือเข้า: เปิด URL นี้ในเบราว์เซอร์บนมือถือ"
echo ""
echo "   $PHONE_URL"
echo ""
echo "⚠️  เงื่อนไข: มือถือต้องต่อ Wi-Fi วงเดียวกับคอมพิวเตอร์เครื่องนี้"
echo "============================================================"

# ---- QR code (if qrencode is installed) so you can scan instead of typing ----
if command -v qrencode >/dev/null 2>&1; then
  echo ""
  qrencode -t ANSIUTF8 "$PHONE_URL"
else
  echo ""
  echo "💡 ติดตั้ง qrencode เพื่อให้โชว์ QR code สแกนง่ายๆ ได้ (ไม่บังคับ):"
  echo "   brew install qrencode"
fi

echo ""
echo "🌐 กำลังสร้าง Public Link ให้คนภายนอก (หรือเน็ตมือถือ) เข้าใช้งาน..."
ssh -o StrictHostKeyChecking=no -p 443 -R 0:localhost:4000 a.pinggy.io < /dev/null > "$ROOT_DIR/.run/pinggy.log" 2>&1 &
sleep 5
PUBLIC_URL=$(cat "$ROOT_DIR/.run/pinggy.log" | grep -o 'https://[^ ]*\.pinggy\.net')

if [ -n "$PUBLIC_URL" ]; then
  echo "============================================================"
  echo "🌍 ลิ้งก์สำหรับส่งให้เพื่อน (คลิกแล้วเข้าได้เลย ทั่วโลก!):"
  echo "   $PUBLIC_URL/Fronend/index.html"
  echo "============================================================"
else
  echo "⚠️ สร้าง Public Link ไม่สำเร็จ กรุณาลองใหม่"
fi

echo ""
echo "หยุดเซิร์ฟเวอร์ทั้งคู่และปิดท่อแชร์ได้ด้วยคำสั่ง: ./stop.sh"
