const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/videos', optionalAuth, reviewController.getVideoFeed);

router.get('/:placeId', reviewController.getReviews);

router.post(
  '/:placeId',
  requireAuth,
  upload.uploadReview.fields([{ name: 'photos', maxCount: 5 }, { name: 'video', maxCount: 1 }]),
  reviewController.addReview
);

router.delete('/:placeId/:reviewId', requireAuth, reviewController.deleteReview);
router.delete('/:placeId/:reviewId/moderate', requireAuth, requireAdmin, reviewController.adminDeleteReview);

// Likes
router.post('/:placeId/:reviewId/like', requireAuth, reviewController.likeReview);
router.delete('/:placeId/:reviewId/like', requireAuth, reviewController.unlikeReview);

// Comments
router.get('/:placeId/:reviewId/comments', reviewController.getComments);
router.post('/:placeId/:reviewId/comments', requireAuth, reviewController.addComment);
router.delete('/:placeId/:reviewId/comments/:commentId', requireAuth, reviewController.deleteComment);
router.delete('/:placeId/:reviewId/comments/:commentId/moderate', requireAuth, requireAdmin, reviewController.adminDeleteComment);

module.exports = router;
