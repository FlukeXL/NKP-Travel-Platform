require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 4000,

  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),

  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',

  WAQI_API_TOKEN: process.env.WAQI_API_TOKEN || '',
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || '',
  MRC_API_KEY: process.env.MRC_API_KEY || '',

  ADMIN_EMAILS: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};

env.FIREBASE_CONFIGURED = Boolean(
  env.FIREBASE_SERVICE_ACCOUNT_PATH || (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY)
);

module.exports = env;
