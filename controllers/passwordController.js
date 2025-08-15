const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const nodemailer = require('nodemailer');
const Joi = require('joi');

// Configure your email transporter (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     // your email
    pass: process.env.EMAIL_PASS,     // app password or normal password
  },
});

// In-memory store for OTPs (WARNING: resets on server restart! Use DB or cache in prod)
const otpStore = {};

/**
 * Send OTP to user email for password update
 */
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP and expiry (10 minutes)
    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Password Update',
      text: `Your OTP for updating your password is: ${otp}. It is valid for 10 minutes.`,
    });

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('sendOtp error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.verifyOtpAndUpdatePassword = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Fetch user with password_hash included
    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check OTP from your in-memory store
    if (!otpStore[email] || otpStore[email].otp !== otp || Date.now() > otpStore[email].expiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Set OTP as new password - hashing done by beforeSave hook
    user.password_hash = otp;

    // Save user with new password
    await user.save();

    // Remove OTP after successful update
    delete otpStore[email];

    res.status(200).json({ message: "Password updated successfully to the OTP" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.updatePassword = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/[A-Z]/, 'uppercase letter')
      .pattern(/[!@#$%^&*(),.?":{}|<>]/, 'special character')
      .required(),
    confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords must match',
    }),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, newPassword } = value;

  try {
    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update with new password (hashing done by beforeSave hook)
    user.password_hash = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('updatePassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
