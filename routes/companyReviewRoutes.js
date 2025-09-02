const express = require('express');
const router = express.Router({ mergeParams: true }); // Enable params from parent router
const reviewController = require('../controllers/companyReviewController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');
const {
  createReviewValidation,
  updateReviewValidation,
  reviewIdValidation,
  companyIdValidation
} = require('../validations/reviewValidators');

// @route   POST /api/company/:companyId/review
// @desc    Create a new company review
// @access  Private (Job Seeker)
router.post(
  '/review',
  isLoggedIn,
  createReviewValidation,
  reviewController.createReview
);

// @route   GET /api/company/:companyId/reviews
// @desc    Get all reviews for a company
// @access  Public
router.get(
  '/reviews',
  companyIdValidation,
  reviewController.getCompanyReviews
);

// @route   PUT /api/company/:companyId/review/:reviewId
// @desc    Update a review
// @access  Private (Review Owner or Admin)
router.put(
  '/review/:reviewId',
  isLoggedIn,
  updateReviewValidation,
  reviewController.updateReview
);

// @route   DELETE /api/company/:companyId/review/:reviewId
// @desc    Delete a review (soft delete by setting visible to false)
// @access  Private (Review Owner or Admin)
router.delete(
  '/review/:reviewId',
  isLoggedIn,
  reviewIdValidation,
  reviewController.deleteReview
);

module.exports = router;
