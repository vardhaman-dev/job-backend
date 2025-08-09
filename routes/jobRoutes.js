const express = require('express');
const router = express.Router();
const { Job, CompanyProfile } = require('../models');
const { searchJobsByQuery } = require('../controllers/jobSearchService');
const { isLoggedIn } = require('../middleware/authMiddleware');


const CATEGORIES_TAGS = {
  "Information Technology": [
    "it", "software", "developer", "engineer", "technology", "java", "python", "cloud",
    "data", "frontend", "backend", "react", "nodejs", "ai", "ml", "devops", "fullstack", "cybersecurity"
  ],

  "Marketing & Sales": [
    "marketing", "sales", "seo", "content", "branding", "digital", "customer", "lead",
    "campaign", "ads", "email", "social", "market research", "copywriting", "crm"
  ],

  "Finance & Accounting": [
    "finance", "accounting", "audit", "tax", "budget", "investment", "ledger", "payroll",
    "compliance", "invoicing", "financial analysis", "forecasting", "bookkeeping"
  ],

  "Human Resources": [
    "hr", "recruitment", "talent", "training", "employee", "relations", "onboarding",
    "payroll", "benefits", "performance", "hrms", "retention"
  ],

  "Business & Consulting": [
    "business", "consulting", "strategy", "management", "operations", "project",
    "analysis", "planning", "market research", "client", "solution design", "pmo"
  ],

  "Design & Creative": [
    "design", "creative", "graphics", "ui", "ux", "illustrator", "photoshop",
    "branding", "motion", "animation", "figma", "adobe", "wireframe", "prototyping"
  ],

  "Legal & Compliance": [
    "legal", "compliance", "contract", "law", "risk", "regulations", "policy",
    "attorney", "litigation", "intellectual property", "corporate law", "legal research"
  ],

  "Healthcare & Medical": [
    "healthcare", "medical", "nurse", "doctor", "clinic", "pharma", "patient",
    "public health", "hospital", "clinical", "lab", "radiology", "diagnosis",
    "physiotherapy", "medical assistant", "health informatics", "epidemiology", "emt", "biotech"
  ]
};
const normalize = (str) => str.toLowerCase().trim();

function assignCategory(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;

  const normalizedTags = tags.map(normalize);
  let bestCategory = null;
  let maxMatches = 0;

  for (const [category, keywords] of Object.entries(CATEGORIES_TAGS)) {
    const normalizedKeywords = keywords.map(normalize);
    const matches = normalizedTags.filter(tag => normalizedKeywords.includes(tag)).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      bestCategory = category;
    }
  }

  return maxMatches > 0 ? bestCategory : null;
}

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create a new job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - location
 *               - type
 *               - company_id
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               type:
 *                 type: string
 *               salary:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *               company_id:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Job created successfully
 *       403:
 *         description: Company not verified or not authorized
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create a new job posting
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - location
 *               - type
 *               - company_id
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               type:
 *                 type: string
 *               salary:
 *                 type: number
 *               deadline:
 *                 type: string
 *                 format: date
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               company_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobId:
 *                   type: integer
 *                 category:
 *                   type: string
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, approved, closed]
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized to post jobs for this company
 *       500:
 *         description: Internal server error
 */
router.post('/', isLoggedIn, async (req, res) => {
  const {
    title, description, location, type, salary,
    deadline, skills, tags, requirements,
    responsibilities, benefits, education, experience, questions
  } = req.body;
  
  // Get the company ID from the authenticated user
  const company_id = req.user.id;
  
  console.log('Creating job for user:', {
    userId: req.user.id,
    email: req.user.email,
    role: req.user.role,
    isCompany: req.user.is_company
  });
  
  // Check if user is authorized to post jobs (must be a company or admin)
  if (req.user.role !== 'admin' && !req.user.is_company) {
    return res.status(403).json({
      success: false,
      message: 'Only companies and admins can post jobs'
    });
  }

  try {
    // Get company profile
    const companyProfile = await CompanyProfile.findOne({
      where: { userId: company_id }
    });

    if (!companyProfile) {
      return res.status(404).json({
        success: false,
        message: 'Company profile not found. Please complete your company profile first.'
      });
    }

    // Determine job status based on company verification status
    // Use 'open' for approved companies, 'draft' for pending companies
    // Note: Status must be one of: 'draft', 'open', 'closed'
    const jobStatus = companyProfile.status === 'approved' ? 'open' : 'draft';

    // Create the job with appropriate status and all fields
    const jobData = {
      company_id,
      title: title || '',
      description: description || '',
      location: location || '',
      type: type || 'full_time', // Default to full_time if not specified
      salary_range: salary ? salary.toString() : null,
      deadline: deadline || null,
      status: jobStatus,
      skills: Array.isArray(skills) ? skills : [],
      tags: Array.isArray(tags) ? tags : [],
      category: assignCategory(tags || []),
      posted_at: new Date(),
      submitted_at: new Date(),
      // Additional fields
      requirements: requirements || '',
      responsibilities: responsibilities || '',
      benefits: benefits || '',
      education: education || '',
      experience: experience || '',
      questions: Array.isArray(questions) ? questions : []
    };
    
    console.log('Creating job with data:', jobData);
    
    const newJob = await Job.create(jobData);

    // Prepare response based on job status
    const response = {
      success: true,
      jobId: newJob.id,
      status: jobStatus,
      message: jobStatus === 'open' 
        ? 'Job posted successfully and is now live!' 
        : 'Job saved as draft. It will be visible to the public once your company is verified and you publish the job.'
    };

    res.status(201).json(response);
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create job',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


// GET /search?q=developer → Search jobs
router.get('/search', async (req, res) => {
  const query = req.query.q || '';
  try {
    const results = await searchJobsByQuery(query);
    res.json({ success: true, jobs: results });
  } catch (err) {
    console.error('Search Error:', err.message);
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
});

/**
 * @swagger
 * /jobs/employer:
 *   get:
 *     tags: [Jobs]
 *     summary: Get jobs posted by the current employer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of jobs posted by the employer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
router.get('/employer', isLoggedIn, async (req, res) => {
  console.log('Fetching jobs for employer ID:', req.user.id);
  
  try {
    const jobs = await Job.findAll({
      where: { company_id: req.user.id },
      order: [['posted_at', 'DESC']],
      include: [
        {
          model: CompanyProfile,
          as: 'companyProfile',
          attributes: ['companyName', 'logo', 'location'],
          required: false
        }
      ],
      raw: false, // Ensure we get model instances for proper JSON serialization
      nest: true  // Better handling of nested includes
    });

    console.log(`Found ${jobs.length} jobs for employer ${req.user.id}`);
    
    // Convert Sequelize instances to plain objects for consistent JSON serialization
    const jobsData = jobs.map(job => {
      const jobData = job.get({ plain: true });
      // Ensure all expected fields exist to prevent frontend errors
      if (!jobData.tags) jobData.tags = [];
      if (!jobData.skills) jobData.skills = [];
      return jobData;
    });

    console.log('Sending jobs data:', JSON.stringify(jobsData, null, 2).substring(0, 500) + '...');
    
    res.json({
      success: true,
      jobs: jobsData
    });
  } catch (error) {
    console.error('Error in /jobs/employer endpoint:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /jobs/company/{companyId}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get jobs by company ID
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the company
 *     responses:
 *       200:
 *         description: List of jobs for the company
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 */
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const jobs = await Job.findAll({
      where: { company_id: companyId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: CompanyProfile,
          as: 'company',
          attributes: ['company_name', 'logo_url', 'location']
        }
      ]
    });

    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('Error fetching company jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company jobs',
      error: error.message
    });
  }
});

module.exports = router;
