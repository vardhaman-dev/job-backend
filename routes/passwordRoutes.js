const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');

router.post('/send-otp', passwordController.sendOtp);
router.post('/verify-otp', passwordController.verifyOtpAndUpdatePassword);
router.post('/update-password', passwordController.updatePassword);

module.exports = router;
