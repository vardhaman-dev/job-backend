// otpStore.js (a simple in-memory store)
const otpStore = new Map(); // key: user email, value: { otp, expiresAt }

function setOtp(email, otp) {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
  otpStore.set(email, { otp, expiresAt });
}

function verifyOtp(email, otp) {
  const record = otpStore.get(email);
  if (!record) return false;
  if (record.otp !== otp) return false;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return false;
  }
  otpStore.delete(email); // remove after successful verify
  return true;
}

module.exports = { setOtp, verifyOtp };
