const { check, param } = require('express-validator');

// Validation for creating a review
exports.createReviewValidation = [
  param('companyId', 'Company ID is required').isInt().toInt(),
  check('rating', 'Rating is required and must be between 1 and 5').isInt({ min: 1, max: 5 }),
  check('comment', 'Comment must be a string').optional().isString()
];

// Validation for updating a review
exports.updateReviewValidation = [
  param('reviewId', 'Review ID is required').isInt().toInt(),
  check('rating', 'Rating must be between 1 and 5').optional().isInt({ min: 1, max: 5 }),
  check('comment', 'Comment must be a string').optional().isString()
];

// Validate review ID parameter
exports.reviewIdValidation = [
  param('reviewId', 'Review ID is required').isInt().toInt()
];

// Validation for company ID parameter
exports.companyIdValidation = [
  param('companyId', 'Company ID is required').isInt().toInt()
    .isInt({ min: 1 })
    .withMessage('Company ID must be a positive integer')
];
