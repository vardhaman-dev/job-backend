const { validationResult } = require('express-validator');
const db = require('../models');
const { sequelize } = require('../config/database');
const CompanyReview = db.CompanyReview;
const User = db.User;

// @desc    Create a new company review
// @route   POST /api/company/:companyId/review
// @access  Private (Job Seeker)
exports.createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment } = req.body;
    const company_id = req.params.companyId; // Get companyId from URL params
    const reviewer_id = req.user.id; // Assuming user ID is available from auth middleware

    // Check if user has already reviewed this company
 const existingReview = await CompanyReview.findOne({
  where: {
    company_id,
    reviewer_id
  }
});

if (existingReview) {
  // Reactivate soft-deleted review if needed
  await existingReview.update({
    rating,
    comment,
    visible: true
  });
  return res.json({
    success: true,
    message: 'Review updated successfully',
    review: existingReview
  });
}

// Otherwise create new
const review = await CompanyReview.create({
  company_id,
  reviewer_id,
  rating,
  comment,
  visible: true
});


    

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Error creating company review:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating company review',
      error: error.message
    });
  }
};

// @desc    Get all reviews for a company
// @route   GET /api/company/:companyId/reviews
// @access  Public
exports.getCompanyReviews = async (req, res) => {
  try {
    const companyId = req.params.companyId; // Get companyId from URL params
    
    const reviews = await sequelize.query(`
      SELECT 
        cr.*,
        u.id as 'reviewer.id',
        u.name as 'reviewer.name',
        u.email as 'reviewer.email'
      FROM company_reviews cr
      LEFT JOIN users u ON cr.reviewer_id = u.id
      WHERE cr.company_id = ? AND cr.visible = 1
      ORDER BY cr.created_at DESC
    `, {
      replacements: [companyId],
      type: sequelize.QueryTypes.SELECT,
      raw: true,
      nest: true
    });
    
    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching company reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company reviews',
      error: error.message
    });
  }
};

// @desc    Update a review
// @route   PUT /api/company/:companyId/review/:reviewId
// @access  Private (Review Owner or Admin)
exports.updateReview = async (req, res) => {
  try {
    const { reviewId, companyId } = req.params;
    const { rating, comment } = req.body;

    // Verify the review belongs to the specified company
    const review = await CompanyReview.findOne({
      where: {
        id: reviewId,
        company_id: companyId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found for this company'
      });
    }
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check if the user is the owner of the review or an admin
    if (review.reviewer_id !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    const updatedReview = await review.update({
      rating: rating || review.rating,
      comment: comment !== undefined ? comment : review.comment
    });

    res.json({
      success: true,
      data: updatedReview
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/company/:companyId/review/:reviewId
// @access  Private (Review Owner or Admin)
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId, companyId } = req.params;

    // Verify the review belongs to the specified company
    const review = await CompanyReview.findOne({
      where: {
        id: reviewId,
        company_id: companyId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Get the logged-in user info
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check if the user is the owner of the review or an admin
    if (review.reviewer_id !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    // For soft delete, just set visible to false
    await review.update({ visible: false });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message
    });
  }
};
