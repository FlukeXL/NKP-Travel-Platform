const express = require('express');
const router = express.Router();
const placeController = require('../controllers/place.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', placeController.getAllPlaces);
router.get('/:id', placeController.getPlace);

router.post('/', requireAuth, requireAdmin, placeController.createPlace);
router.patch('/:id', requireAuth, requireAdmin, placeController.updatePlace);
router.delete('/:id', requireAuth, requireAdmin, placeController.deletePlace);

router.post('/photos', requireAuth, requireAdmin, upload.array('photos', 10), placeController.uploadPlacePhotos);

module.exports = router;
