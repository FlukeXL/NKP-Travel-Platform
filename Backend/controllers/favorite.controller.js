const { isFirebaseReady } = require('../config/firebase');
const favoriteModel = require('../models/favorite.model');
const devStore = require('../utils/devStore');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');

const DEV_FAVORITES = 'favorites';

function devDocId(uid, placeId) {
  return `${uid}_${placeId}`;
}

const getMyFavorites = asyncHandler(async (req, res) => {
  if (isFirebaseReady()) {
    const placeIds = await favoriteModel.getFavoritePlaceIds(req.user.uid);
    return ok(res, { placeIds });
  }

  const all = devStore.readAll(DEV_FAVORITES);
  const placeIds = Object.values(all)
    .filter((f) => f.uid === req.user.uid)
    .map((f) => f.placeId);
  return ok(res, { placeIds });
});

const addFavorite = asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  if (!placeId) throw new ApiError(400, 'Missing placeId');

  if (isFirebaseReady()) {
    await favoriteModel.addFavorite(req.user.uid, placeId);
  } else {
    devStore.set(DEV_FAVORITES, devDocId(req.user.uid, placeId), {
      uid: req.user.uid,
      placeId,
      createdAt: new Date().toISOString(),
    });
  }
  return ok(res, { placeId, favorited: true }, 201);
});

const removeFavorite = asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  if (isFirebaseReady()) {
    await favoriteModel.removeFavorite(req.user.uid, placeId);
  } else {
    devStore.remove(DEV_FAVORITES, devDocId(req.user.uid, placeId));
  }
  return ok(res, { placeId, favorited: false });
});

module.exports = { getMyFavorites, addFavorite, removeFavorite };
