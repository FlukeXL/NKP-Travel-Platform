const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getAllUsers);
router.patch('/users/:uid/role', adminController.setUserRole);
router.delete('/users/:uid', adminController.deleteUser);
router.get('/reviews', adminController.getAllReviews);
router.get('/videos', adminController.getAllVideos);
router.get('/checkins', adminController.getAllCheckins);
router.get('/audit-logs', adminController.getAuditLogs);
router.post('/audit-logs/purge-old', adminController.purgeOldAuditLogs);
router.delete('/audit-logs/all', adminController.clearAuditLogs);
router.delete('/audit-logs/:id', adminController.deleteAuditLog);

module.exports = router;
