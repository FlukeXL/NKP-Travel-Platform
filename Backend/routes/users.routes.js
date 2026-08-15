const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/:uid', userController.getUser);
router.patch('/:uid', requireAuth, userController.updateUser);
router.post('/:uid/avatar', requireAuth, upload.single('avatar'), userController.updateAvatar);

module.exports = router;

