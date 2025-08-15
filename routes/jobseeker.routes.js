const express = require('express');
const { getSuggestions, searchJobseekers } = require('../controllers/jobseeker.controller.js');

const router = express.Router();

router.get('/suggestions/:companyId', getSuggestions);
router.get('/search', searchJobseekers);

module.exports = router;
