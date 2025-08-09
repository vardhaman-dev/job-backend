const express = require("express");
const router = express.Router();
const { sequelize } = require("../config/database");

const DEBUG = true; // Toggle this off in production

// Parses either a JSON array or comma-separated string
const parseTags = (input) => {
  if (!input) return [];

  try {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;

    if (Array.isArray(parsed)) {
      return parsed.map(s =>
        String(s)
          .replace(/^[\s,'"]+|[\s,'"]+$/g, "") // trims quotes, commas, spaces
      ).filter(Boolean);
    }

    return [];
  } catch {
    return String(input)
      .split(",")
      .map(s =>
        s.replace(/^[\s,'"]+|[\s,'"]+$/g, "")
      )
      .filter(Boolean);
  }
};

// Normalize skill/tag strings
const normalize = (str) =>
  str.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

const tokenize = (str) => normalize(str).split(/\s+/);

// Compute match score using Jaccard similarity
const computeMatch = (userSkills, jobTags, title = "") => {
  const userSet = new Set(userSkills.map(normalize));
  const jobSet = new Set([
    ...jobTags.map(normalize),
    ...tokenize(title).filter((word) => word.length > 2),
  ]);

  const matches = [...userSet].filter((skill) => jobSet.has(skill));

  return userSet.size + jobSet.size === 0
    ? 0
    : +(2 * matches.length / (userSet.size + jobSet.size)).toFixed(2);
};

router.get("/suggest/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    if (DEBUG) console.log("🔍 Received request for user ID:", userId);

    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Fetch user skills from job_seeker_profiles
    const userResult = await sequelize.query(
      "SELECT skills_json FROM job_seeker_profiles WHERE user_id = ?",
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!userResult.length) {
      if (DEBUG) console.log("⚠️ No user found in job_seeker_profiles");
      return res.status(404).json({ error: "User not found" });
    }

    if (DEBUG) console.log("🧾 Raw skills_json from DB:", userResult[0].skills_json);

    let userSkills = [];
    try {
      userSkills = JSON.parse(userResult[0].skills_json || "[]");
    } catch (err) {
      console.error("❌ Failed to parse user skills:", err.message);
      return res.status(400).json({ error: "Invalid skills format" });
    }

    if (!Array.isArray(userSkills) || userSkills.length === 0) {
  if (DEBUG) console.log("⚠️ User has no skills listed — showing latest jobs");

  const latestJobs = await sequelize.query(
    "SELECT id, title, location FROM jobs WHERE status = 'open' ORDER BY created_at DESC LIMIT 5",
    {
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return res.json(latestJobs);
}


    if (DEBUG) console.log("✅ Parsed user skills:", userSkills);

    // Fetch open jobs
    const jobs = await sequelize.query(
      "SELECT id, title, tags, location, skills FROM jobs WHERE status = 'open' LIMIT 100",
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (DEBUG) console.log("📦 Jobs fetched:", jobs.length);

    // Compute suggestions
    const suggestions = jobs.map((job) => {
      if (DEBUG) console.log(`\n🔹 Processing Job ID: ${job.id}, Title: "${job.title}"`);

      // ✅ Priority: use `skills` first, fallback to `tags`
      let jobTags = parseTags(job.skills);
      if (DEBUG) console.log("📎 Parsed skills:", jobTags);

      if (jobTags.length === 0) {
        jobTags = parseTags(job.tags);
        if (DEBUG) console.log("📎 Fallback to parsed tags:", jobTags);
      }

      const match = computeMatch(userSkills, jobTags, job.title);

      if (DEBUG) console.log("🎯 Match score:", match);

      return {
        jobId: job.id,
        title: job.title || "Untitled",
        location: job.location || "N/A",
        match,
      };
    });

    // Sort by match score and prepare top 5 suggestions
    const topSuggestions = suggestions
      .filter((s) => s.match > 0)
      .sort((a, b) => b.match - a.match)
      .slice(0, 5);

    // Fallback if fewer than 5 matches
    if (topSuggestions.length < 5) {
      const fallback = suggestions
        .filter((s) => s.match === 0)
        .slice(0, 5 - topSuggestions.length);
      topSuggestions.push(...fallback);
    }

    if (DEBUG) {
      console.log("\n✅ Final top suggestions:");
      topSuggestions.forEach((s) =>
        console.log(`➡️  ${s.title} (${s.match})`)
      );
    }

    res.json(topSuggestions);
  } catch (err) {
    console.error("🔥 Suggestion error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
