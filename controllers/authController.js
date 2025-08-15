// authController.js
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
require('dotenv').config();

// In-memory OTP store (use Redis or database in production)
const otpStore = {};

// Configure Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify SMTP configuration
transporter.verify((error, success) => {
  if (error) console.error('SMTP configuration error:', error);
  else console.log('SMTP server ready for sending emails');
});

// Register User and Send OTP
exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, subscribe } = req.body; // Adjusted to lowercase 'name'

  try {
    // Check if email already exists
    const [existingUsers] = await db.execute('SELECT email FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
      userData: { name, email, password, subscribe },
    };

    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'JobHub OTP Verification',
      html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Error in registerUser:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// Verify OTP and Create User
exports.verifyUserOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const record = otpStore[email];

  if (!record) {
    return res.status(400).json({ success: false, message: 'OTP not found or invalid' });
  }

  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ success: false, message: 'Incorrect OTP' });
  }

  try {
    const hashed = await bcrypt.hash(record.userData.password, 10);

    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role, lastLogin) VALUES (?, ?, ?, ?, ?)',
      [
        record.userData.name,
        record.userData.email,
        hashed,
        'job_seeker',
        null, // lastLogin is null for new users
      ]
    );

    const userId = result.insertId;
    delete otpStore[email];

    // Generate JWT token
    const payload = {
      userId: userId,
      role: 'job_seeker',
      name: record.userData.name,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '2d',
    });

    res.json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: userId,
        name: record.userData.name,
        email: record.userData.email,
        role: 'job_seeker',
        isNewUser: true, // Indicate new user
      },
    });
  } catch (err) {
    console.error('Error in verifyUserOtp:', err);
    res.status(500).json({ success: false, message: 'Server error while creating account' });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];

    if (!user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'User registered via OAuth, please use that method to login',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Update lastLogin
    await db.execute('UPDATE users SET lastLogin = ? WHERE id = ?', [new Date(), user.id]);

    const isNewUser = user.lastLogin === null; // If lastLogin was null, this is the first login

    const payload = {
      userId: user.id,
      role: user.role || 'job_seeker',
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '2d',
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'job_seeker',
        isNewUser, // Include isNewUser flag
      },
    });
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Current User (/auth/me)
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT middleware
    const [rows] = await db.execute('SELECT id, name, email, role, lastLogin FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    const isNewUser = user.lastLogin === null || new Date(user.lastLogin) > new Date(Date.now() - 5 * 60 * 1000); // Consider new if last login was within 5 minutes

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isNewUser,
      },
    });
  } catch (err) {
    console.error('Error in getCurrentUser:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};