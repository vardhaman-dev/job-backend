const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../models');
const { loginValidator } = require('../validations/authValidators');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const crypto = require('crypto');
const { getDashboardStats } = require('../controllers/admin/dashboardController');
const { getReportedJobSeekers } = require('../controllers/admin/jobSeekerReportsController');
const { getReportedCompanies } = require('../controllers/admin/companyReportsController');

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
// In-memory rate limiting store (use Redis in production)
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

router.post('/login', loginValidator, async (req, res, next) => {
  const { email, password, ip } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Log the login attempt
  console.log('Admin login attempt:', { 
    email, 
    ip: clientIp,
    userAgent: req.headers['user-agent']
  });

  try {
    // Check rate limiting
    const loginKey = `login:${email}:${clientIp}`;
    const attempt = loginAttempts.get(loginKey) || { count: 0, lastAttempt: 0, blockedUntil: 0 };
    
    // Reset counter if the last attempt was long ago
    if (now - attempt.lastAttempt > LOGIN_BLOCK_DURATION) {
      attempt.count = 0;
      attempt.blockedUntil = 0;
    }
    
    // Check if IP is blocked
    if (now < attempt.blockedUntil) {
      const retryAfter = Math.ceil((attempt.blockedUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again later.',
        retryAfter,
        code: 'TOO_MANY_ATTEMPTS'
      });
    }
    
    // Find admin user with case-insensitive email comparison (MySQL compatible)
    const admin = await User.scope('withPassword').findOne({
      where: { 
        email: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), 'LIKE', '%' + email.toLowerCase() + '%'),
        role: 'admin',
        status: 'active' 
      }
    });
    
    // Log the admin lookup result
    console.log('Admin lookup result:', { 
      found: !!admin,
      adminId: admin?.id,
      email: admin?.email 
    });

    // Check if admin exists and password is correct
    const isValidCredentials = admin && await admin.validPassword(password);
    
    if (!isValidCredentials) {
      // Increment failed login attempts
      attempt.count++;
      attempt.lastAttempt = now;
      
      // Block if too many attempts
      if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        attempt.blockedUntil = now + LOGIN_BLOCK_DURATION;
        const retryAfter = Math.ceil(LOGIN_BLOCK_DURATION / 1000);
        
        loginAttempts.set(loginKey, attempt);
        
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts. Please try again in ${retryAfter} seconds.`,
          retryAfter,
          code: 'ACCOUNT_TEMPORARILY_LOCKED'
        });
      }
      
      loginAttempts.set(loginKey, attempt);
      
      // Log failed attempt
      console.warn('Failed admin login attempt:', { 
        email, 
        ip: clientIp,
        attempts: attempt.count,
        remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.count
      });
      
      // Return generic error message to prevent user enumeration
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.count,
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Reset login attempts on successful login
    loginAttempts.delete(loginKey);
    
    // Create JWT token with additional security claims
    const tokenPayload = { 
      id: admin.id, 
      email: admin.email, 
      role: 'admin',
      name: admin.name || 'Admin User',
      iss: 'jobhub-admin-api',
      aud: 'jobhub-admin-dashboard',
      sub: 'admin-auth',
      jti: require('crypto').randomBytes(16).toString('hex') // Unique token ID
    };
    
    const token = jwt.sign(
      tokenPayload,
      jwtConfig.secret,
      { 
        expiresIn: jwtConfig.expiresIn,
        algorithm: 'HS256', // Explicitly specify algorithm
        noTimestamp: false // Include issued at time
      }
    );
    
    // Convert JWT expiresIn to milliseconds (8h = 8 * 60 * 60 * 1000 = 28800000)
    const maxAge = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    
    // Set secure, HTTP-only cookie with the token
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/',
      domain: process.env.COOKIE_DOMAIN || 'localhost'
    });
    
    // Log successful login
    console.log('Admin login successful:', { 
      adminId: admin.id, 
      email: admin.email,
      ip: clientIp 
    });
    
    // Return success response with minimal user data
    const response = {
      success: true,
      token: 'Bearer ' + token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        lastLogin: admin.lastLogin
      },
      expiresIn: jwtConfig.expiresIn,
      redirectTo: '/admin/dashboard'
    };
    
    // Update last login timestamp directly in the database to bypass model validations
    await sequelize.query(
      'UPDATE users SET last_login = ? WHERE id = ?',
      {
        replacements: [new Date(), admin.id],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('Admin login error:', {
      error: error.message,
      stack: error.stack,
      email,
      ip: clientIp
    });
    
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/logout:
 *   post:
 *     summary: Admin logout
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: admin_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', isLoggedIn, isAdmin, (req, res) => {
  try {
    // Clear the HTTP-only cookie
    res.clearCookie('admin_token', {
      path: '/',
      domain: process.env.COOKIE_DOMAIN || 'localhost',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Log the logout
    console.log('Admin logged out:', { 
      adminId: req.user.id,
      email: req.user.email 
    });

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Successfully logged out',
      redirectTo: '/admin/login'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      code: 'LOGOUT_ERROR'
    });
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
 * /api/admin/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: Total number of users
 *                     jobSeekers:
 *                       type: integer
 *                       description: Total number of job seekers
 *                     totalCompanies:
 *                       type: integer
 *                       description: Total number of companies
 *                     pendingApprovals:
 *                       type: integer
 *                       description: Number of pending company approvals
 *                     activeUsers30Days:
 *                       type: integer
 *                       description: Number of active users in last 30 days
 *                     newSignups7Days:
 *                       type: integer
 *                       description: Number of new signups in last 7 days
 *                     activeJobs:
 *                       type: integer
 *                       description: Number of active job postings
 *                     monthlyApplications:
 *                       type: integer
 *                       description: Number of job applications this month
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/stats', isLoggedIn, isAdmin, getDashboardStats);

/**
 * @swagger
 * /api/admin/job_seekers/reports:
 *   get:
 *     summary: Get job seekers with 3 or more reports
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of job seekers with 3+ reports
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
 *                     $ref: '#/components/schemas/ReportedJobSeeker'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/job_seekers/reports', isLoggedIn, isAdmin, getReportedJobSeekers);

/**
 * @swagger
 * /api/admin/companies/reports:
 *   get:
 *     summary: Get companies with 3 or more reports
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of companies with 3+ reports
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
 *                     $ref: '#/components/schemas/ReportedCompany'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/companies/reports', isLoggedIn, isAdmin, getReportedCompanies);

module.exports = router;
