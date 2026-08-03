const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favorite.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, favoriteController.getMyFavorites);
router.post('/:placeId', requireAuth, favoriteController.addFavorite);
router.delete('/:placeId', requireAuth, favoriteController.removeFavorite);

module.exports = router;
