const pm25Service = require('../services/pm25.service');
const { asyncHandler, ok } = require('../utils/helper');

const getCurrent = asyncHandler(async (req, res) => {
  const { district } = req.query;
  if (district) {
    const byDistrict = await pm25Service.getCurrentPm25ByDistrict();
    return ok(res, { district, ...byDistrict[district] });
  }
  return ok(res, await pm25Service.getCurrentPm25());
});

const getHistory = asyncHandler(async (req, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
  const { district } = req.query;
  const rows = district
    ? (await pm25Service.getPm25HistoryByDistrict(days))[district]
    : await pm25Service.getPm25History(days);
  return ok(res, { district: district || null, days, rows });
});

module.exports = { getCurrent, getHistory };
