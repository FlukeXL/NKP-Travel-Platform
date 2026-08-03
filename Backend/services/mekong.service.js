const axios = require('axios');
const { mrc, openMeteo } = require('../config/apiKeys');
const { dailyToRows, round } = require('../utils/formatter');

const MEKONG_STATION = { lat: 17.375, lng: 104.775024 };

const MEKONG_DISCHARGE_MIN = 2000; 
const MEKONG_DISCHARGE_NORMAL = 9000; 
const MEKONG_DISCHARGE_MAX = 25000; 

function dischargeToPercent(value) {
  if (typeof value !== 'number') return null;
  if (value <= MEKONG_DISCHARGE_NORMAL) {
    const t = (value - MEKONG_DISCHARGE_MIN) / (MEKONG_DISCHARGE_NORMAL - MEKONG_DISCHARGE_MIN);
    return Math.round(Math.max(0, Math.min(1, t)) * 50);
  }
  const t = (value - MEKONG_DISCHARGE_NORMAL) / (MEKONG_DISCHARGE_MAX - MEKONG_DISCHARGE_NORMAL);
  return Math.round(50 + Math.max(0, Math.min(1, t)) * 50);
}

async function mnxFetchFromMrc(days) {
  if (!mrc.apiKey || !mrc.nakhonPhanomStationId) {
    throw new Error('MRC API not configured (missing MRC_API_KEY or station ID)');
  }
  const { data } = await axios.get(`${mrc.baseUrl}/water-level`, {
    params: {
      station: mrc.nakhonPhanomStationId,
      days,
      apikey: mrc.apiKey,
    },
    timeout: 10000,
  });
  return data;
}

async function getCurrentMekongLevel() {
  try {
    const mrcData = await mnxFetchFromMrc(2);
    if (mrcData) return mrcData;
  } catch {
  }

  const { data } = await axios.get(openMeteo.floodBaseUrl, {
    params: {
      latitude: MEKONG_STATION.lat,
      longitude: MEKONG_STATION.lng,
      daily: 'river_discharge',
      past_days: 2,
      forecast_days: 0,
    },
    timeout: 10000,
  });

  const times = data.daily?.time || [];
  const values = data.daily?.river_discharge || [];
  const lastIdx = values.length - 1;
  const value = round(values[lastIdx], 1);
  const percent = dischargeToPercent(value);

  let trend = 'ระดับน้ำทรงตัว';
  if (values.length >= 2 && typeof values[lastIdx - 1] === 'number') {
    const diff = values[lastIdx] - values[lastIdx - 1];
    if (diff > values[lastIdx - 1] * 0.05) trend = 'ระดับน้ำเพิ่มขึ้น';
    else if (diff < -values[lastIdx - 1] * 0.05) trend = 'ระดับน้ำลดลง';
  }

  return { level: value, unit: 'm³/s', percent, trend, asOf: times[lastIdx] || null };
}

/** 7-day past daily river discharge history. */
async function getMekongHistory(days = 7) {
  try {
    const mrcData = await mnxFetchFromMrc(days);
    if (mrcData) return mrcData; // TODO: map real MRC response shape
  } catch {
    // MRC not configured yet — fall through to Open-Meteo below.
  }

  const { data } = await axios.get(openMeteo.floodBaseUrl, {
    params: {
      latitude: MEKONG_STATION.lat,
      longitude: MEKONG_STATION.lng,
      daily: 'river_discharge',
      past_days: days,
      forecast_days: 0,
    },
    timeout: 10000,
  });
  const rows = dailyToRows(data.daily.time, data.daily.river_discharge, 1);
  return rows.slice(-days);
}

module.exports = { dischargeToPercent, getCurrentMekongLevel, getMekongHistory };
