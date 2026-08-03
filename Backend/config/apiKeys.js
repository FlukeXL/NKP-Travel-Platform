const env = require('./env');

module.exports = {
  waqi: {
    apiKey: env.WAQI_API_TOKEN,
    feedBaseUrl: 'https://api.waqi.info/feed',
  },

  openWeather: {
    apiKey: env.OPENWEATHER_API_KEY,
    currentWeatherBaseUrl: 'https://api.openweathermap.org/data/2.5/weather',
  },

  mrc: {
    apiKey: env.MRC_API_KEY,
    baseUrl: 'https://portal.mrcmekong.org/api/time-series',
    nakhonPhanomStationId: '',
  },

  openMeteo: {
    weatherBaseUrl: 'https://api.open-meteo.com/v1/forecast',
    airQualityBaseUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    floodBaseUrl: 'https://flood-api.open-meteo.com/v1/flood',
    archiveBaseUrl: 'https://archive-api.open-meteo.com/v1/archive',
  },

  gemini: {
    apiKey: env.GEMINI_API_KEY,
    model: 'gemini-3.1-flash-lite',
    generateContentUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
  },

  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
  },
};
