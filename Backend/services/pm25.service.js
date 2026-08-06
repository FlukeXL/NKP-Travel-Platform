const axios = require('axios');
const { waqi, openMeteo } = require('../config/apiKeys');
const { PROVINCE_CENTER, DISTRICTS } = require('../config/districts');
const { hourlyToDailyAverage, round } = require('../utils/formatter');

function pm25ToPercent(value) {
  if (typeof value !== 'number') return null;
  return Math.round(Math.min(100, (value / 150) * 100));
}

async function fetchCurrentPm25FromWaqi(lat, lng) {
  const { data } = await axios.get(`${waqi.feedBaseUrl}/geo:${lat};${lng}/`, {
    params: { token: waqi.apiKey },
    timeout: 10000,
  });
  if (data.status !== 'ok') throw new Error(data.data || 'WAQI request failed');
  const value = round(data.data?.iaqi?.pm25?.v, 1);
  return value;
}

async function fetchCurrentPm25FromOpenMeteo(lat, lng) {
  const { data } = await axios.get(openMeteo.airQualityBaseUrl, {
    params: { latitude: lat, longitude: lng, current: 'pm2_5', timezone: 'Asia/Bangkok' },
    timeout: 10000,
  });
  return round(data.current?.pm2_5, 1);
}

async function getCurrentPm25Detail() {
  const { data } = await axios.get(openMeteo.airQualityBaseUrl, {
    params: {
      latitude: PROVINCE_CENTER.lat,
      longitude: PROVINCE_CENTER.lng,
      current: 'pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,european_aqi',
      timezone: 'Asia/Bangkok',
    },
    timeout: 10000,
  });
  const c = data.current || {};
  return {
    pm10: round(c.pm10, 1),
    co: round(c.carbon_monoxide, 1),
    no2: round(c.nitrogen_dioxide, 1),
    so2: round(c.sulphur_dioxide, 1),
    o3: round(c.ozone, 1),
    usAqi: c.us_aqi ?? null,
    europeanAqi: c.european_aqi ?? null,
  };
}

async function getCurrentPm25() {
  let value;
  try {
    // ดึงค่า PM2.5 ตามพิกัดตัวเมืองนครพนมโดยเฉพาะ (lat: 17.4107, lng: 104.7791)
    value = await fetchCurrentPm25FromOpenMeteo(PROVINCE_CENTER.lat, PROVINCE_CENTER.lng);
  } catch (err) {
    console.error('[pm25.service] Open-Meteo request failed, trying WAQI fallback:', err.message);
  }

  if (value == null && waqi.apiKey) {
    try {
      value = await fetchCurrentPm25FromWaqi(PROVINCE_CENTER.lat, PROVINCE_CENTER.lng);
    } catch (err) {
      console.error('[pm25.service] WAQI request failed:', err.message);
    }
  }

  let detail = {};
  try {
    detail = await getCurrentPm25Detail();
  } catch (err) {
    console.error('[pm25.service] Failed to fetch extra pollutant detail:', err.message);
  }

  return { value, unit: 'µg/m³', percent: pm25ToPercent(value), location: 'ตัวเมืองนครพนม', ...detail };
}

async function getCurrentPm25ByDistrict() {
  const { data } = await axios.get(openMeteo.airQualityBaseUrl, {
    params: {
      latitude: DISTRICTS.map((d) => d.lat).join(','),
      longitude: DISTRICTS.map((d) => d.lng).join(','),
      current: 'pm2_5',
      timezone: 'Asia/Bangkok',
    },
    timeout: 15000,
  });

  const list = Array.isArray(data) ? data : [data];
  return Object.fromEntries(
    DISTRICTS.map((d, i) => {
      const value = round(list[i]?.current?.pm2_5, 1);
      return [d.name, { value, unit: 'µg/m³', percent: pm25ToPercent(value) }];
    })
  );
}

async function fetchPm25History(lat, lng, days = 7) {
  const { data } = await axios.get(openMeteo.airQualityBaseUrl, {
    params: {
      latitude: lat,
      longitude: lng,
      hourly: 'pm2_5',
      past_days: days,
      forecast_days: 0,
      timezone: 'Asia/Bangkok',
    },
    timeout: 10000,
  });
  const rows = hourlyToDailyAverage(data.hourly.time, data.hourly.pm2_5);
  return rows.slice(-days);
}

async function getPm25History(days = 7) {
  return fetchPm25History(PROVINCE_CENTER.lat, PROVINCE_CENTER.lng, days);
}

async function getPm25HistoryByDistrict(days = 7) {
  const { data } = await axios.get(openMeteo.airQualityBaseUrl, {
    params: {
      latitude: DISTRICTS.map((d) => d.lat).join(','),
      longitude: DISTRICTS.map((d) => d.lng).join(','),
      hourly: 'pm2_5',
      past_days: days,
      forecast_days: 0,
      timezone: 'Asia/Bangkok',
    },
    timeout: 15000,
  });

  const list = Array.isArray(data) ? data : [data];
  return Object.fromEntries(
    DISTRICTS.map((d, i) => {
      const hourly = list[i]?.hourly;
      const rows = hourly ? hourlyToDailyAverage(hourly.time, hourly.pm2_5).slice(-days) : [];
      return [d.name, rows];
    })
  );
}

module.exports = {
  pm25ToPercent,
  getCurrentPm25,
  getCurrentPm25ByDistrict,
  getPm25History,
  getPm25HistoryByDistrict,
  fetchPm25History,
};
