const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkin.controller');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { uploadReview } = require('../middleware/upload');

router.get('/feed', optionalAuth, checkinController.getFeed);

router.post(
  '/',
  requireAuth,
  uploadReview.fields([
    { name: 'photos', maxCount: 5 },
    { name: 'video', maxCount: 1 },
  ]),
  checkinController.addPost
);
router.delete('/:postId', requireAuth, checkinController.deletePost);
router.delete('/:postId/moderate', requireAuth, requireAdmin, checkinController.adminDeletePost);

router.post('/:postId/like', requireAuth, checkinController.likePost);
router.delete('/:postId/like', requireAuth, checkinController.unlikePost);

router.get('/:postId/comments', checkinController.getComments);
router.post('/:postId/comments', requireAuth, checkinController.addComment);
router.delete('/:postId/comments/:commentId', requireAuth, checkinController.deleteComment);
router.delete('/:postId/comments/:commentId/moderate', requireAuth, requireAdmin, checkinController.adminDeleteComment);

router.get('/notes/mine', requireAuth, checkinController.getMyNotes);
router.post('/notes', requireAuth, checkinController.addNote);
router.delete('/notes/:noteId', requireAuth, checkinController.deleteNote);

module.exports = router;
