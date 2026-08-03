const express = require('express');
const router = express.Router();
const trafficController = require('../controllers/traffic.controller');

router.get('/current', trafficController.getCurrent);

module.exports = router;
