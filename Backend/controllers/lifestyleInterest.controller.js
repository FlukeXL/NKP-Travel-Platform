const lifestyleInterestModel = require('../models/lifestyleInterest.model');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');

const VALID_CATEGORIES = ['cafe', 'mutelu', 'shopping', 'food', 'culture', 'nature'];

function assertValidCategory(category) {
  if (!VALID_CATEGORIES.includes(category)) {
    throw new ApiError(400, `Invalid lifestyle category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
}

const getInterestCount = asyncHandler(async (req, res) => {
  const { category } = req.params;
  assertValidCategory(category);

  const count = await lifestyleInterestModel.getInterestCount(category);
  let interested = false;
  if (req.user) interested = await lifestyleInterestModel.isInterested(req.user.uid, category);

  return ok(res, { category, count, interested });
});

const addInterest = asyncHandler(async (req, res) => {
  const { category } = req.params;
  assertValidCategory(category);

  await lifestyleInterestModel.addInterest(req.user.uid, category);
  return ok(res, { category, interested: true }, 201);
});

const removeInterest = asyncHandler(async (req, res) => {
  const { category } = req.params;
  assertValidCategory(category);

  await lifestyleInterestModel.removeInterest(req.user.uid, category);
  return ok(res, { category, interested: false });
});

module.exports = { getInterestCount, addInterest, removeInterest };
