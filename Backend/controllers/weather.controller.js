const weatherService = require('../services/weather.service');
const { PROVINCE_CENTER } = require('../config/districts');
const { asyncHandler, ok } = require('../utils/helper');

const getCurrent = asyncHandler(async (req, res) => {
  return ok(res, await weatherService.getCurrentWeather());
});

const getHistory = asyncHandler(async (req, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
  return ok(res, { days, rows: await weatherService.getWeatherHistory(days) });
});

const getTemperatureCurrent = asyncHandler(async (req, res) => {
  const { district } = req.query;
  if (district) {
    const byDistrict = await weatherService.getCurrentTemperatureByDistrict();
    return ok(res, { district, value: byDistrict[district], unit: '°C' });
  }
  const current = await weatherService.getCurrentWeather();
  return ok(res, { value: current.temp, unit: '°C' });
});

const getTemperatureHistory = asyncHandler(async (req, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
  const { district } = req.query;
  const rows = district
    ? (await weatherService.getTemperatureHistoryByDistrict(days))[district]
    : await weatherService.fetchDailyTempHistory(PROVINCE_CENTER.lat, PROVINCE_CENTER.lng, days);
  return ok(res, { district: district || null, days, rows });
});

module.exports = { getCurrent, getHistory, getTemperatureCurrent, getTemperatureHistory };
