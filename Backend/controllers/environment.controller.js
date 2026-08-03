const pm25Service = require('../services/pm25.service');
const weatherService = require('../services/weather.service');
const mekongService = require('../services/mekong.service');
const trafficService = require('../services/traffic.service');
const excelService = require('../services/excel.service');
const { PROVINCE_CENTER } = require('../config/districts');
const { asyncHandler, ok, lastNDates } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');

const BANDS_DEFAULT = [
  { max: 10, label: 'สดใส', color: '#4fae67' },
  { max: 25, label: 'ดี', color: '#7fbf6a' },
  { max: 50, label: 'ปกติ', color: '#c9a227' },
  { max: 75, label: 'เริ่มไม่ดี', color: '#e08a3c' },
  { max: 90, label: 'ควรดูแลสุขภาพ', color: '#d9622f' },
  { max: 100, label: 'สถานการณ์เข้าขั้นวิกฤต', color: '#c9392f' },
];
const BANDS_MEKONG = [
  { max: 10, label: 'น้ำน้อยวิกฤต', color: '#c9392f' },
  { max: 25, label: 'น้ำน้อย', color: '#d9622f' },
  { max: 50, label: 'ระดับน้ำปกติ', color: '#4fae67' },
  { max: 75, label: 'น้ำเริ่มสูง', color: '#e08a3c' },
  { max: 90, label: 'น้ำล้นตลิ่ง', color: '#d9622f' },
  { max: 100, label: 'น้ำท่วมอุทกภัยวิกฤต', color: '#c9392f' },
];

const getSnapshot = asyncHandler(async (req, res) => {
  const [pm25, weather, mekong, traffic] = await Promise.all([
    pm25Service.getCurrentPm25(),
    weatherService.getCurrentWeather(),
    mekongService.getCurrentMekongLevel(),
    trafficService.getTrafficSnapshot(),
  ]);

  return ok(res, {
    bands: { default: BANDS_DEFAULT, mekong: BANDS_MEKONG },
    pm25,
    weather,
    temperature: { provinceValue: weather.temp, feelsLike: weather.feelsLike, unit: '°C' },
    mekong,
    traffic,
    fetchedAt: new Date().toISOString(),
  });
});

const getDistrictSnapshot = asyncHandler(async (req, res) => {
  const [pm25ByDistrict, tempByDistrict] = await Promise.all([
    pm25Service.getCurrentPm25ByDistrict(),
    weatherService.getCurrentTemperatureByDistrict(),
  ]);
  return ok(res, { pm25ByDistrict, temperatureByDistrict: tempByDistrict });
});

const getHistory = asyncHandler(async (req, res) => {
  const metric = req.query.metric || 'pm25';
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
  const district = req.query.district;

  let rows;
  switch (metric) {
    case 'pm25':
      rows = district ? (await pm25Service.getPm25HistoryByDistrict(days))[district] : await pm25Service.getPm25History(days);
      break;
    case 'weather':
      rows = await weatherService.getWeatherHistory(days);
      break;
    case 'temperature':
      rows = district ? (await weatherService.getTemperatureHistoryByDistrict(days))[district] : await weatherService.fetchDailyTempHistory(PROVINCE_CENTER.lat, PROVINCE_CENTER.lng, days);
      break;
    case 'mekong':
      rows = await mekongService.getMekongHistory(days);
      break;
    default:
      throw new ApiError(400, 'metric ต้องเป็นหนึ่งใน pm25, weather, temperature, mekong');
  }

  if (!rows) throw new ApiError(404, `ไม่พบข้อมูลย้อนหลังสำหรับ metric="${metric}" district="${district || ''}"`);
  return ok(res, { metric, district: district || null, days, rows });
});

const getHistoryByDistrict = asyncHandler(async (req, res) => {
  const metric = req.query.metric || 'pm25';
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));

  let byDistrict;
  if (metric === 'pm25') byDistrict = await pm25Service.getPm25HistoryByDistrict(days);
  else if (metric === 'temperature') byDistrict = await weatherService.getTemperatureHistoryByDistrict(days);
  else throw new ApiError(400, 'metric ต้องเป็น pm25 หรือ temperature เท่านั้น (ตัวชี้วัดอื่นไม่แบ่งเขตอำเภอ)');

  return ok(res, { metric, days, byDistrict });
});
const exportHistory = asyncHandler(async (req, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));

  const [pm25Rows, tempRows, mekongRows] = await Promise.all([
    pm25Service.getPm25History(days),
    weatherService.getWeatherHistory(days),
    mekongService.getMekongHistory(days),
  ]);

  const buffer = await excelService.buildHistoryWorkbook([
    { title: 'PM2.5', unit: 'µg/m³', rows: pm25Rows },
    { title: 'อุณหภูมิ', unit: '°C', rows: tempRows },
    { title: 'ระดับแม่น้ำโขง', unit: 'm³/s', rows: mekongRows },
  ]);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="nakhonphanom-environment-${days}d.xlsx"`);
  res.send(buffer);
});

module.exports = { getSnapshot, getDistrictSnapshot, getHistory, getHistoryByDistrict, exportHistory };
