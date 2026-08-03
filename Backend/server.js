const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const env = require('./config/env');
const logger = require('./middleware/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { isFirebaseReady } = require('./config/firebase');
const {
  helmetMiddleware,
  globalLimiter,
  authLimiter,
  aiLimiter,
  sanitizeInputs,
  staticUploadHeaders,
} = require('./middleware/security');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const environmentRoutes = require('./routes/environment.routes');
const pm25Routes = require('./routes/pm25.routes');
const weatherRoutes = require('./routes/weather.routes');
const mekongRoutes = require('./routes/mekong.routes');
const trafficRoutes = require('./routes/traffic.routes');
const favoritesRoutes = require('./routes/favorites.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const lifestyleInterestRoutes = require('./routes/lifestyleInterest.routes');
const placesRoutes = require('./routes/places.routes');
const adminRoutes = require('./routes/admin.routes');
const checkinRoutes = require('./routes/checkin.routes');
const eventsRoutes = require('./routes/events.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
app.set('trust proxy', 1); // Trust reverse proxy / loopback for correct IP rate-limiting

// 1. Security Headers (Helmet)
app.use(helmetMiddleware);

// 2. CORS Configuration
const LAN_ORIGIN_RE = /^http:\/\/(\d{1,3}\.){3}\d{1,3}:(8000|5500)$/;
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === 'null' || env.CORS_ORIGINS.includes(origin) || LAN_ORIGIN_RE.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

// 3. Body parsers with payload size limits (Anti-DoS)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Request Sanitization against XSS & Prototype Pollution
app.use(sanitizeInputs);

// 5. Global Rate Limiter for all API routes
app.use('/api', globalLimiter);

// 6. Request Logger
app.use(logger);

// 7. Secure static file serving for uploads
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads'), {
  setHeaders: staticUploadHeaders,
  dotfiles: 'ignore',
  index: false,
}));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    firebase: isFirebaseReady() ? 'connected' : 'dev-fallback (see Backend/.env.example)',
    time: new Date().toISOString(),
  });
});

// 8. Specific Rate Limited Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);

// 9. Application Resource Routes
app.use('/api/users', usersRoutes);
app.use('/api/environment', environmentRoutes);
app.use('/api/pm25', pm25Routes);
app.use('/api/weather', weatherRoutes);
app.use('/api/mekong', mekongRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/lifestyle', lifestyleInterestRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/recommendations', require('./routes/recommendation.routes'));
app.use('/api/sponsors', require('./routes/ad.routes'));
app.use('/api/promos', require('./routes/ad.routes')); // AdBlocker-safe alias

app.use(notFoundHandler);
app.use(errorHandler);

if (isFirebaseReady()) {
  const { getDb, COLLECTIONS } = require('./config/database');
  const pm25Service = require('./services/pm25.service');
  const weatherService = require('./services/weather.service');
  const mekongService = require('./services/mekong.service');
  const auditLogModel = require('./models/auditLog.model');

  cron.schedule(
    '5 0 * * *',
    async () => {
      try {
        const [pm25, weather, mekong] = await Promise.all([
          pm25Service.getCurrentPm25(),
          weatherService.getCurrentWeather(),
          mekongService.getCurrentMekongLevel(),
        ]);
        const today = new Date().toISOString().slice(0, 10);
        await getDb().collection(COLLECTIONS.ENVIRONMENT_HISTORY).doc(today).set(
          { date: today, pm25, weather, mekong, recordedAt: new Date().toISOString() },
          { merge: true }
        );
        console.log(`[cron] Saved environment snapshot for ${today}`);
      } catch (err) {
        console.error('[cron] Failed to save daily environment snapshot:', err.message);
      }
    },
    { timezone: 'Asia/Bangkok' }
  );
  cron.schedule(
    '15 0 * * *',
    async () => {
      try {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 2);
        const deletedCount = await auditLogModel.deleteLogsOlderThan(cutoff.toISOString());
        if (deletedCount) console.log(`[cron] Purged ${deletedCount} audit log entr${deletedCount === 1 ? 'y' : 'ies'} older than 2 months`);
      } catch (err) {
        console.error('[cron] Failed to purge old audit logs:', err.message);
      }
    },
    { timezone: 'Asia/Bangkok' }
  );
}

app.listen(env.PORT, () => {
  console.log(`Nakhon Phanom Lifestyle Travel Platform Backend listening on http://localhost:${env.PORT}`);
  console.log(`Firebase: ${isFirebaseReady() ? 'connected' : 'NOT configured — using local dev-mode fallback (see .env.example)'}`);
});

module.exports = app;
