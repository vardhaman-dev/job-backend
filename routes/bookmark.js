// routes/bookmark.js
const express = require("express");
const router = express.Router();
const { sequelize } = require("../config/database"); // adjust path
const { QueryTypes } = require("sequelize");
const { Bookmark, Job, User, CompanyProfile } = require('../models');



// Add bookmark
router.post("/", async (req, res) => {
  const { user_id, job_id } = req.body;

  try {
    await sequelize.query(
      "INSERT IGNORE INTO bookmarks (user_id, job_id) VALUES (?, ?)",
      {
        replacements: [user_id, job_id],
        type: QueryTypes.INSERT
      }
    );
    res.status(201).json({ message: "Bookmarked" });
  } catch (error) {
    console.error("Bookmark error:", error);
    res.status(500).json({ error: "Could not add bookmark" });
  }
});

router.delete("/", async (req, res) => {
  const { user_id, job_id } = req.body;

  try {
    await sequelize.query(
      "DELETE FROM bookmarks WHERE user_id = ? AND job_id = ?",
      {
        replacements: [user_id, job_id],
        type: QueryTypes.DELETE
      }
    );

    res.status(200).json({ message: "Removed bookmark" });
  } catch (error) {
    console.error("Remove bookmark error:", error);
    res.status(500).json({ error: "Could not remove bookmark" });
  }
});


// Check bookmark status
router.get("/:user_id/:job_id", async (req, res) => {
  const { user_id, job_id } = req.params;

  try {
    const [results] = await sequelize.query(
      "SELECT 1 FROM bookmarks WHERE user_id = ? AND job_id = ? LIMIT 1",
      {
        replacements: [user_id, job_id],
        type: QueryTypes.SELECT
      }
    );

    res.json({ bookmarked: !!results });
  } catch (error) {
    console.error("Check bookmark error:", error);
    res.status(500).json({ error: "Could not check bookmark" });
  }
});

// GET all bookmarked jobs for a user (with job details)
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const bookmarks = await Bookmark.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Job,
          as: 'job', // make sure alias matches your association
          include: [{ model: CompanyProfile, as: 'company' }]
        }
      ]
    });

    const jobData = bookmarks.map(b => ({
      id: b.job.id,
      title: b.job.title,
      company: b.job.company.companyName,
      location: b.job.location,
      salary: b.job.salary_range,
      skills: b.job.skills,
      type: b.job.type,
      posted: b.job.posted_at,
      deadline: b.job.deadline,
      
    }));

    res.json(jobData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

module.exports = router;
