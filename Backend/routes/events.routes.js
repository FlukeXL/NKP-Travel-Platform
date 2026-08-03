const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const upload = require('../middleware/upload');

router.get('/', eventController.getActiveEvents);

router.get('/all', requireAuth, requireAdmin, eventController.getAllEvents);
router.post('/', requireAuth, requireAdmin, eventController.createEvent);
router.post('/upload-banner', requireAuth, requireAdmin, upload.single('banner'), eventController.uploadBanner);
router.patch('/:id', requireAuth, requireAdmin, eventController.updateEvent);
router.delete('/:id', requireAuth, requireAdmin, eventController.deleteEvent);

module.exports = router;
