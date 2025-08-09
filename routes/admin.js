const express = require('express');
const router = express.Router();
const { loginValidator } = require('../validations/authValidators');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const companyVerificationController = require('../controllers/admin/companyVerificationController');
const { body, param } = require('express-validator');

/**
 * @swagger
 * /api/admin/verify-token:
 *   get:
 *     summary: Verify admin token
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Invalid or missing token
 */
router.get('/verify-token', isLoggedIn, isAdmin, async (req, res) => {
  try {
    // If we got here, the token is valid and user is admin
    res.json({
      success: true,
      admin: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token'
    });
  }
});

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', loginValidator, async (req, res, next) => {
  console.log('Admin login request received:', { email: req.body.email });
  
  try {
    const { email, password } = req.body;
    
    console.log('Looking for admin user with email:', email);
    
    // Find admin user
    const admin = await User.scope('withPassword').findOne({
      where: { 
        email,
        role: 'admin',
        status: 'active' 
      }
    });
    
    console.log('Admin user found:', !!admin);

    // Check if admin exists and password is correct
    if (!admin || !(await admin.validPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Debug logging
    console.log('Creating JWT token for admin:', { id: admin.id, email: admin.email });
    console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'undefined');
    
    // Create JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    
    console.log('Token created successfully:', token.substring(0, 10) + '...');

    // Return token and admin data
    res.json({
      success: true,
      token: 'Bearer ' + token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      },
      redirectTo: '/admin/dashboard'  // Frontend should handle this redirect
    });

  } catch (error) {
    console.error('Admin login error:', error);
    next(error);
  }
});

// Protected admin routes
router.use(isLoggedIn, isAdmin);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the admin dashboard',
    admin: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    }
  });
});

/**
 * @swagger
 * /api/admin/companies/pending:
 *   get:
 *     summary: Get list of pending company verifications
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of pending companies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CompanyProfile'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/companies/pending', isLoggedIn, isAdmin, companyVerificationController.getPendingCompanies);

/**
 * @swagger
 * /api/admin/companies/{companyId}/approve:
 *   post:
 *     summary: Approve a company verification
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the company to approve
 *     responses:
 *       200:
 *         description: Company approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.post('/companies/:companyId/approve', 
  isLoggedIn, 
  isAdmin,
  [
    param('companyId').isInt().withMessage('Company ID must be an integer')
  ],
  companyVerificationController.approveCompany
);

/**
 * @swagger
 * /api/admin/companies/{companyId}/reject:
 *   post:
 *     summary: Reject a company verification
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the company to reject
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Company rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing or invalid rejection reason
 *       404:
 *         description: Company not found
 *       500:
 *         description: Internal server error
 */
router.post('/companies/:companyId/reject', 
  isLoggedIn, 
  isAdmin,
  [
    param('companyId').isInt().withMessage('Company ID must be an integer'),
    body('reason').notEmpty().withMessage('Rejection reason is required')
  ],
  companyVerificationController.rejectCompany
);

/**
 * @swagger
 * /api/admin/companies/{companyId}/verification-history:
 *   get:
 *     summary: Get verification history for a company
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the company
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Verification history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CompanyVerification'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/companies/:companyId/verification-history', 
  isLoggedIn, 
  isAdmin,
  [
    param('companyId').isInt().withMessage('Company ID must be an integer')
  ],
  companyVerificationController.getVerificationHistory
);

module.exports = router;
