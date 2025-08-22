// utils/notificationService.js
const { Notification } = require("../models");

async function createNotification(userId, message) {
  return await Notification.create({
    user_id: userId,
    message,
  });
}

module.exports = { createNotification };
