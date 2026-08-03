const { isFirebaseReady } = require('../config/firebase');
const lifestyleInterestModel = require('../models/lifestyleInterest.model');
const devStore = require('../utils/devStore');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');

const DEV_INTERESTS = 'lifestyle_interests';

const VALID_CATEGORIES = ['cafe', 'mutelu', 'shopping', 'food', 'culture', 'nature'];

function devDocId(uid, category) {
  return `${uid}_${category}`;
}

function assertValidCategory(category) {
  if (!VALID_CATEGORIES.includes(category)) {
    throw new ApiError(400, `Invalid lifestyle category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
}

const getInterestCount = asyncHandler(async (req, res) => {
  const { category } = req.params;
  assertValidCategory(category);

  let count;
  let interested = false;

  if (isFirebaseReady()) {
    count = await lifestyleInterestModel.getInterestCount(category);
    if (req.user) interested = await lifestyleInterestModel.isInterested(req.user.uid, category);
  } else {
    const all = devStore.readAll(DEV_INTERESTS);
    const rows = Object.values(all).filter((r) => r.category === category);
    count = rows.length;
    if (req.user) interested = rows.some((r) => r.uid === req.user.uid);
  }

  return ok(res, { category, count, interested });
});

const addInterest = asyncHandler(async (req, res) => {
  const { category } = req.params;
  assertValidCategory(category);

  if (isFirebaseReady()) {
    await lifestyleInterestModel.addInterest(req.user.uid, category);
  } else {
    devStore.set(DEV_INTERESTS, devDocId(req.user.uid, category), {
      uid: req.user.uid,
      category,
      createdAt: new Date().toISOString(),
    });
  }
  return ok(res, { category, interested: true }, 201);
});

const removeInterest = asyncHandler(async (req, res) => {
  const { category } = req.params;
  assertValidCategory(category);

  if (isFirebaseReady()) {
    await lifestyleInterestModel.removeInterest(req.user.uid, category);
  } else {
    devStore.remove(DEV_INTERESTS, devDocId(req.user.uid, category));
  }
  return ok(res, { category, interested: false });
});

module.exports = { getInterestCount, addInterest, removeInterest };
