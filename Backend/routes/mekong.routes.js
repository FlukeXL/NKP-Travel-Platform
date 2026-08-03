const express = require('express');
const router = express.Router();
const mekongController = require('../controllers/mekong.controller');

router.get('/current', mekongController.getCurrent);
router.get('/history', mekongController.getHistory);

module.exports = router;
