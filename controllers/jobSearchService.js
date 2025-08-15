const { Job, CompanyProfile } = require('../models');
const { Op } = require('sequelize');

function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

async function searchJobsByQuery(query) {
  const normalizedQuery = normalizeText(query);

  // Fetch jobs that match the company name
  const jobsByCompany = await Job.findAll({
    attributes: ['id', 'title', 'tags', 'location', 'skills', 'salary_range', 'type', 'posted_at','experience_min'],
    where: { status: 'open' },
    include: [
      {
        model: CompanyProfile,
        as: 'company', // must match association alias
        attributes: ['companyName'],
        where: {
          companyName: {
            [Op.like]: `%${query}%` // MySQL-friendly
          }
        },
        required: true
      }
    ]
  });

  // Fetch all jobs for title/tag matching
  const allJobs = await Job.findAll({
    attributes: ['id', 'title', 'tags', 'location', 'skills', 'salary_range', 'type', 'posted_at', 'experience_min'],
    include: [
      {
        model: CompanyProfile,
        as: 'company',
        attributes: ['companyName']
      }
    ]
  });

  const titleMatches = [];
  const tagMatches = [];

  for (const job of allJobs) {
    const title = normalizeText(job.title || '');
    let tags = [];

    try {
      tags = typeof job.tags === 'string' ? JSON.parse(job.tags) : job.tags || [];
    } catch {
      tags = [];
    }

    if (title.includes(normalizedQuery)) {
      titleMatches.push(job);
    } else if (tags.some(tag => normalizeText(tag).includes(normalizedQuery))) {
      tagMatches.push(job);
    }
  }

  // Merge results: company matches first, then title/tag matches
  const seen = new Set();
  const mergedResults = [];

  for (const job of [...jobsByCompany, ...titleMatches, ...tagMatches]) {
    if (!seen.has(job.id)) {
      seen.add(job.id);
      mergedResults.push(job);
    }
  }

  return mergedResults; // same raw Sequelize objects as original
}

module.exports = {
  normalizeText,
  searchJobsByQuery
};
