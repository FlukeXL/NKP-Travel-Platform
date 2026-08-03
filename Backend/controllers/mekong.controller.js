const mekongService = require('../services/mekong.service');
const { asyncHandler, ok } = require('../utils/helper');

const getCurrent = asyncHandler(async (req, res) => {
  return ok(res, await mekongService.getCurrentMekongLevel());
});

const getHistory = asyncHandler(async (req, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
  return ok(res, { days, rows: await mekongService.getMekongHistory(days) });
});

module.exports = { getCurrent, getHistory };
