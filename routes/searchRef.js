// routes/searchRef.js
const express = require("express");
const mysql = require("mysql2/promise");
const axios = require("axios");

const router = express.Router();

// MySQL connection pool (initialized once)
let db;
(async () => {
  db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
})();

router.post("/api/search-ref", async (req, res) => {
  const { userQuery } = req.body;

  try {
    const [jobs] = await db.query("SELECT id, title FROM jobs LIMIT 50");

    const jobList = jobs.map(job => `${job.id}: ${job.title}`).join('\n');

    const prompt = `
User query: "${userQuery}"

Here are job titles:

${jobList}

Return a comma-separated list of job IDs that best match the user's query.
Only return job IDs. No explanation.
`;

   const response = await axios.post('http://127.0.0.1:11434/api/generate', {
  model: "mistral",
  prompt,
  stream: false
});

    const ids = response.data.response
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));

    if (ids.length === 0) return res.json({ jobs: [] });

    const [results] = await db.query("SELECT * FROM jobs WHERE id IN (?)", [ids]);
    res.json({ jobs: results });

  } catch (err) {
    console.error("Error in /api/search-ref:", err.message);
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
