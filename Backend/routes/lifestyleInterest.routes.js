const express = require('express');
const router = express.Router();
const lifestyleInterestController = require('../controllers/lifestyleInterest.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');

router.get('/:category/interest-count', optionalAuth, lifestyleInterestController.getInterestCount);
router.post('/:category/interest', requireAuth, lifestyleInterestController.addInterest);
router.delete('/:category/interest', requireAuth, lifestyleInterestController.removeInterest);

module.exports = router;
