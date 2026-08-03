const express = require('express');
const router = express.Router();
const environmentController = require('../controllers/environment.controller');

router.get('/snapshot', environmentController.getSnapshot);
router.get('/snapshot/districts', environmentController.getDistrictSnapshot);
router.get('/history', environmentController.getHistory);
router.get('/history/districts', environmentController.getHistoryByDistrict);
router.get('/export', environmentController.exportHistory);

module.exports = router;
