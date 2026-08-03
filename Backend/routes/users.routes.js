const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/:uid', userController.getUser);
router.patch('/:uid', requireAuth, userController.updateUser);

module.exports = router;
