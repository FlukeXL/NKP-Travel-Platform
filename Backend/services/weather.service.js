const axios = require('axios');
const { openWeather, openMeteo } = require('../config/apiKeys');
const { PROVINCE_CENTER, DISTRICTS } = require('../config/districts');
const { hourlyToDailyAverage, round } = require('../utils/formatter');

const WMO_DESC_TH = {
  0: 'ท้องฟ้าแจ่มใส', 1: 'แจ่มใส เมฆบางส่วน', 2: 'มีเมฆบางส่วน', 3: 'มีเมฆมาก',
  45: 'มีหมอก', 48: 'หมอกน้ำแข็ง',
  51: 'ฝนปรอยเล็กน้อย', 53: 'ฝนปรอยปานกลาง', 55: 'ฝนปรอยหนัก',
  61: 'ฝนตกเล็กน้อย', 63: 'ฝนตกปานกลาง', 65: 'ฝนตกหนัก',
  71: 'หิมะตกเล็กน้อย', 73: 'หิมะตกปานกลาง', 75: 'หิมะตกหนัก',
  80: 'ฝนฟ้าคะนองเล็กน้อย', 81: 'ฝนฟ้าคะนองปานกลาง', 82: 'ฝนฟ้าคะนองรุนแรง',
  95: 'พายุฝนฟ้าคะนอง', 96: 'พายุฝนฟ้าคะนองมีลูกเห็บ', 99: 'พายุฝนฟ้าคะนองมีลูกเห็บรุนแรง',
};

const OWM_DESC_TH = {
  Clear: 'ท้องฟ้าแจ่มใส',
  Clouds: 'มีเมฆบางส่วน',
  Rain: 'ฝนตก',
  Drizzle: 'ฝนปรอย',
  Thunderstorm: 'พายุฝนฟ้าคะนอง',
  Snow: 'หิมะตก',
  Mist: 'มีหมอก', Fog: 'มีหมอก', Haze: 'มีหมอก',
};

function weatherCodeToDesc(code) {
  return WMO_DESC_TH[code] || 'ไม่มีข้อมูลสภาพอากาศ';
}

async function fetchCurrentFromOpenWeather(lat, lng) {
  const { data } = await axios.get(openWeather.currentWeatherBaseUrl, {
    params: { lat, lon: lng, appid: openWeather.apiKey, units: 'metric' },
    timeout: 10000,
  });
  return {
    temp: round(data.main?.temp, 1),
    desc: OWM_DESC_TH[data.weather?.[0]?.main] || data.weather?.[0]?.description || 'ไม่มีข้อมูลสภาพอากาศ',
    humidity: data.main?.humidity ?? null,
    rainChance: null,
    feelsLike: round(data.main?.feels_like, 1),
    pressure: data.main?.pressure ?? null,
    windSpeed: data.wind?.speed != null ? round(data.wind.speed * 3.6, 1) : null,
    windDeg: data.wind?.deg ?? null,
    visibility: data.visibility ?? null,
    uvIndex: null,
  };
}

async function fetchCurrentFromOpenMeteo(lat, lng) {
  const { data } = await axios.get(openMeteo.weatherBaseUrl, {
    params: {
      latitude: lat,
      longitude: lng,
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weathercode,precipitation_probability,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,uv_index',
      timezone: 'Asia/Bangkok',
    },
    timeout: 10000,
  });
  const c = data.current || {};
  return {
    temp: round(c.temperature_2m, 1),
    desc: weatherCodeToDesc(c.weathercode),
    humidity: c.relative_humidity_2m ?? null,
    rainChance: c.precipitation_probability ?? null,
    feelsLike: round(c.apparent_temperature, 1),
    pressure: c.surface_pressure != null ? Math.round(c.surface_pressure) : null,
    windSpeed: round(c.wind_speed_10m, 1),
    windDeg: c.wind_direction_10m ?? null,
    visibility: c.visibility ?? null,
    uvIndex: round(c.uv_index, 1),
  };
}

async function fillMissingWeatherFields(result, lat, lng) {
  const missing = ['rainChance', 'uvIndex'].filter((k) => result[k] == null);
  if (!missing.length) return result;
  try {
    const supplement = await fetchCurrentFromOpenMeteo(lat, lng);
    missing.forEach((k) => { result[k] = supplement[k]; });
  } catch {

  }
  return result;
}

async function getCurrentWeather() {
  let result = null;
  if (openWeather.apiKey) {
    try {
      result = await fetchCurrentFromOpenWeather(PROVINCE_CENTER.lat, PROVINCE_CENTER.lng);
    } catch (err) {
      console.error('[weather.service] OpenWeatherMap request failed, falling back to Open-Meteo:', err.message);
    }
  }
  if (!result) result = await fetchCurrentFromOpenMeteo(PROVINCE_CENTER.lat, PROVINCE_CENTER.lng);
  else result = await fillMissingWeatherFields(result, PROVINCE_CENTER.lat, PROVINCE_CENTER.lng);
  return { ...result, unit: '°C' };
}

async function getWeatherHistory(days = 7) {
  return fetchDailyTempHistory(PROVINCE_CENTER.lat, PROVINCE_CENTER.lng, days);
}

async function getCurrentTemperatureByDistrict() {
  if (openWeather.apiKey) {
    try {
      const results = await Promise.all(
        DISTRICTS.map(async (d) => {
          const { temp } = await fetchCurrentFromOpenWeather(d.lat, d.lng);
          return [d.name, temp];
        })
      );
      return Object.fromEntries(results);
    } catch (err) {
      console.error('[weather.service] OpenWeatherMap district fetch failed, falling back to Open-Meteo:', err.message);
    }
  }

  const { data } = await axios.get(openMeteo.weatherBaseUrl, {
    params: {
      latitude: DISTRICTS.map((d) => d.lat).join(','),
      longitude: DISTRICTS.map((d) => d.lng).join(','),
      current: 'temperature_2m',
      timezone: 'Asia/Bangkok',
    },
    timeout: 15000,
  });
  const list = Array.isArray(data) ? data : [data];
  return Object.fromEntries(DISTRICTS.map((d, i) => [d.name, round(list[i]?.current?.temperature_2m, 1)]));
}

async function fetchDailyTempHistory(lat, lng, days = 7) {
  const { data } = await axios.get(openMeteo.weatherBaseUrl, {
    params: {
      latitude: lat,
      longitude: lng,
      hourly: 'temperature_2m',
      past_days: days,
      forecast_days: 0,
      timezone: 'Asia/Bangkok',
    },
    timeout: 10000,
  });
  const rows = hourlyToDailyAverage(data.hourly.time, data.hourly.temperature_2m);
  return rows.slice(-days);
}

async function getTemperatureHistoryByDistrict(days = 7) {
  const { data } = await axios.get(openMeteo.weatherBaseUrl, {
    params: {
      latitude: DISTRICTS.map((d) => d.lat).join(','),
      longitude: DISTRICTS.map((d) => d.lng).join(','),
      hourly: 'temperature_2m',
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
      const rows = hourly ? hourlyToDailyAverage(hourly.time, hourly.temperature_2m).slice(-days) : [];
      return [d.name, rows];
    })
  );
}

module.exports = {
  getCurrentWeather,
  getWeatherHistory,
  getCurrentTemperatureByDistrict,
  getTemperatureHistoryByDistrict,
  fetchDailyTempHistory,
};
