const express = require('express');
const router = express.Router();
const pm25Controller = require('../controllers/pm25.controller');

router.get('/current', pm25Controller.getCurrent);
router.get('/history', pm25Controller.getHistory);

module.exports = router;
