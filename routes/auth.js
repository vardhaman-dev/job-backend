const express = require('express');
const { body } = require('express-validator');
const { registerUser, verifyUserOtp, loginUser } = require('../controllers/authController');

const router = express.Router();


router.post(
  '/signup',
  [
    body('firstName').notEmpty().trim().withMessage('First name is required'),
    body('lastName').notEmpty().trim().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  registerUser
);


router.post(
  '/verify-otp',
  [
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  verifyUserOtp
);


router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  loginUser
);

module.exports = router;