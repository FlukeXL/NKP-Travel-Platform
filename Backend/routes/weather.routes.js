const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weather.controller');

router.get('/current', weatherController.getCurrent);
router.get('/history', weatherController.getHistory);
router.get('/temperature/current', weatherController.getTemperatureCurrent);
router.get('/temperature/history', weatherController.getTemperatureHistory);

module.exports = router;
