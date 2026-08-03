const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

router.post('/tour-guide/chat', aiController.tourGuideChat);

module.exports = router;
