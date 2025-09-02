const jwt = require('jsonwebtoken');
const { User } = require('../models');
const jwtConfig = require('../config/jwt');

const protect = async (req, res, next) => {
  console.log('[AuthMiddleware] Start auth check');
  try {
    const authHeader = req.header('Authorization');
    console.log('[AuthMiddleware] Authorization header:', authHeader);
    if (!authHeader) {
      console.log('[AuthMiddleware] No Authorization header');
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    let token = authHeader;
    while (token.toLowerCase().startsWith('bearer ')) {
      token = token.substring(7).trim();
    }
    console.log('[AuthMiddleware] Token extracted:', token.substring(0, 20) + '...');

    const decoded = jwt.verify(token, jwtConfig.secret);
    console.log('[AuthMiddleware] Token decoded:', decoded);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      console.log('[AuthMiddleware] User not found');
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }
    console.log('[AuthMiddleware] User found:', user.email);

    req.user = user;
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error);
    return res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

/**
 * Middleware to check if user is the owner or admin
 */
const isOwnerOrAdmin = (req, res, next) => {
  // If user is admin, allow access
  if (req.user.role === 'admin') {
    return next();
  }

  // If user is trying to access their own profile
  if (req.user.id === parseInt(req.params.id)) {
    return next();
  }

  // If neither admin nor owner, deny access
  res.status(403).json({ 
    success: false, 
    message: 'Not authorized to access this resource' 
  });
};

/**
 * Middleware to check if user is admin with additional security checks
 */
const isAdmin = async (req, res, next) => {
  try {
    // Log the incoming request for debugging
    console.log('[isAdmin] Checking admin access for request:', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      user: req.user ? { id: req.user.id, email: req.user.email } : 'No user'
    });

    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      console.warn('[isAdmin] Unauthorized: No user in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Rate limiting check (simple in-memory example)
    const rateLimitKey = `admin:${req.user.id}:${req.ip}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 30;
    
    // In a production environment, use Redis or similar for rate limiting
    if (!req.rateLimit) req.rateLimit = {};
    if (!req.rateLimit[rateLimitKey]) {
      req.rateLimit[rateLimitKey] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Reset the count if the window has passed
    if (now > req.rateLimit[rateLimitKey].resetTime) {
      req.rateLimit[rateLimitKey] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Increment the request count
    req.rateLimit[rateLimitKey].count++;
    
    // Check if rate limit exceeded
    if (req.rateLimit[rateLimitKey].count > maxRequests) {
      console.warn(`[isAdmin] Rate limit exceeded for user ${req.user.id} from ${req.ip}`);
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((req.rateLimit[rateLimitKey].resetTime - now) / 1000)
      });
    }

    // Verify the user still exists and is an admin
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      console.warn(`[isAdmin] User not found: ${req.user.id}`);
      return res.status(401).json({
        success: false,
        message: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (user.role !== 'admin') {
      console.warn(`[isAdmin] Access denied: User ${user.id} is not an admin`);
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }
    
    if (user.status !== 'active') {
      console.warn(`[isAdmin] Inactive admin account: ${user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Admin account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Add security headers
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - req.rateLimit[rateLimitKey].count,
      'X-RateLimit-Reset': Math.ceil(req.rateLimit[rateLimitKey].resetTime / 1000)
    };
    
    // Set all security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Add admin user to request for downstream middleware/routes
    req.admin = user.get({ plain: true });
    delete req.admin.password; // Never send password hash
    
    // Log successful admin access
    console.log(`[isAdmin] Admin access granted: ${user.email} (${user.id})`);
    
    // Continue to the route
    next();
  } catch (error) {
    console.error('[isAdmin] Error verifying admin privileges:', error);
    
    // More specific error handling
    if (error.name === 'SequelizeConnectionError') {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    }
    
    // Default error response
    res.status(500).json({
      success: false,
      message: 'Internal server error while verifying admin privileges',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Alias for backward compatibility
const isLoggedIn = protect;

module.exports = {
  protect,
  isLoggedIn,
  isOwnerOrAdmin,
  isAdmin
};
