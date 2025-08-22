const express = require("express");
const { Note, JobApplication } = require("../models"); // <- import from index.js

const router = express.Router();

// GET notes for a given job_id + user_id
router.get("/:jobId/:userId", async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(jobId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid jobId or userId" });
    }

    // Optional: check if application exists
    const app = await JobApplication.findOne({
      where: { job_id: jobId, job_seeker_id: userId },
    });

    if (!app) {
      return res.status(404).json({ error: "Application not found for this job/user" });
    }

    const notes = await Note.findAll({
      where: { job_id: jobId, user_id: userId },
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, count: notes.length, notes });
  } catch (err) {
    console.error("GET notes error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST a note
router.post("/:jobId/:userId", async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const userId = parseInt(req.params.userId, 10);
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: "Note text is required" });
    }

    // Check if application exists
    const app = await JobApplication.findOne({
      where: { job_id: jobId, job_seeker_id: userId },
    });

    if (!app) return res.status(404).json({ error: "Application not found for this job/user" });

    const created = await Note.create({
      job_id: jobId,
      user_id: userId,
      note: note.trim(),
    });

    res.status(201).json({ success: true, note: created });
  } catch (err) {
    console.error("POST note error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
