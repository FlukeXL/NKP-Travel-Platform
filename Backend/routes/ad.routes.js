const express = require('express');
const router = express.Router();
const adController = require('../controllers/ad.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/active', adController.getActiveAds);
router.get('/', requireAuth, requireAdmin, adController.getAllAds);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  upload.single('image'),
  adController.createAd
);

router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  upload.single('image'),
  adController.updateAd
);

router.delete('/:id', requireAuth, requireAdmin, adController.deleteAd);

module.exports = router;
