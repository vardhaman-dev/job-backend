// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const { Notification } = require("../models");

// ✅ Get all notifications for a user
router.get("/:userId", async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.params.userId },
      order: [["created_at", "DESC"]],
    });
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching notifications" });
  }
});

// ✅ Get single notification by ID
router.get("/single/:id", async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching notification" });
  }
});

// ✅ Create a new notification
router.post("/", async (req, res) => {
  try {
    const { user_id, message, type, action_url, action_text } = req.body;
    const notification = await Notification.create({
      user_id,
      message,
      type: type || "info",
      action_url,
      action_text,
      seen: false,
    });
    res.status(201).json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating notification" });
  }
});

// ✅ Mark notification as seen
router.put("/:id/seen", async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    notification.seen = true;
    await notification.save();
    res.json({ success: true, notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating notification" });
  }
});

// ✅ Mark all notifications as seen for a user
router.put("/:userId/seen-all", async (req, res) => {
  try {
    await Notification.update(
      { seen: true },
      { where: { user_id: req.params.userId } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error marking all notifications as seen" });
  }
});

// ✅ Delete a notification
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Notification.destroy({
      where: { id: req.params.id },
    });
    if (!deleted) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting notification" });
  }
});

// ✅ Delete all notifications for a user
router.delete("/user/:userId", async (req, res) => {
  try {
    await Notification.destroy({
      where: { user_id: req.params.userId },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting user notifications" });
  }
});

module.exports = router;
