const trafficService = require('../services/traffic.service');
const { asyncHandler, ok } = require('../utils/helper');

const getCurrent = asyncHandler(async (req, res) => {
  return ok(res, await trafficService.getTrafficSnapshot());
});

module.exports = { getCurrent };
