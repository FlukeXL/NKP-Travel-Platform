// PM2 Ecosystem Config — MapNexus
// รัน: pm2 start ecosystem.config.js --env production
// ดู log: pm2 logs mapnexus-backend
// Startup: pm2 startup && pm2 save

module.exports = {
  apps: [
    {
      name: 'mapnexus-backend',
      script: './Backend/server.js',
      cwd: __dirname,

      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },

      // Development (local)
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000,
      },

      // Auto-restart settings
      watch: false,               // ปิด watch ใน production
      max_memory_restart: '300M', // restart ถ้าใช้ RAM เกิน 300MB
      restart_delay: 3000,        // รอ 3 วิก่อน restart
      max_restarts: 10,           // restart ได้สูงสุด 10 ครั้ง

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: '.run/pm2-out.log',
      error_file: '.run/pm2-err.log',
      merge_logs: true,

      // Timezone (Bangkok)
      env: {
        TZ: 'Asia/Bangkok',
      },
    },
  ],
};
