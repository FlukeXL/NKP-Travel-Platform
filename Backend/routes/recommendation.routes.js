const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendation.controller');
const { optionalAuth } = require('../middleware/auth');

router.get('/personalized', optionalAuth, recommendationController.getPersonalizedPlaces);
router.get('/weekly', optionalAuth, recommendationController.getWeeklyPlaces);

module.exports = router;
