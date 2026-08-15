const favoriteModel = require('../models/favorite.model');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');

const getMyFavorites = asyncHandler(async (req, res) => {
  const placeIds = await favoriteModel.getFavoritePlaceIds(req.user.uid);
  return ok(res, { placeIds });
});

const addFavorite = asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  if (!placeId) throw new ApiError(400, 'Missing placeId');

  await favoriteModel.addFavorite(req.user.uid, placeId);
  return ok(res, { placeId, favorited: true }, 201);
});

const removeFavorite = asyncHandler(async (req, res) => {
  const { placeId } = req.params;
  if (!placeId) throw new ApiError(400, 'Missing placeId');

  await favoriteModel.removeFavorite(req.user.uid, placeId);
  return ok(res, { placeId, favorited: false });
});

module.exports = { getMyFavorites, addFavorite, removeFavorite };
