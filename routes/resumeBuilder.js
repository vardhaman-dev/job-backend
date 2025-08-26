const express = require('express');
const router = express.Router();
const ResumeBuilderController = require('../controllers/resumeBuilderController');
const { isLoggedIn } = require('../middleware/authMiddleware');

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Resume builder routes working!' });
});

/**
 * @swagger
 * /api/resume-builder/generate:
 *   post:
 *     summary: Generate ATS-optimized resume
 *     tags: [Resume Builder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 description: ID of target job for optimization
 *               templateId:
 *                 type: string
 *                 default: modern
 *                 description: Resume template to use
 *               sections:
 *                 type: object
 *                 description: Custom sections data
 *     responses:
 *       200:
 *         description: ATS-optimized resume generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 resume:
 *                   type: object
 *                 optimizations:
 *                   type: array
 *                 score:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User profile not found
 */
router.post('/generate', isLoggedIn, ResumeBuilderController.generateATSOptimizedResume);

/**
 * @swagger
 * /api/resume-builder/analyze:
 *   post:
 *     summary: Analyze resume for ATS compatibility
 *     tags: [Resume Builder]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resumeText
 *             properties:
 *               resumeText:
 *                 type: string
 *                 description: Resume content to analyze
 *               jobId:
 *                 type: integer
 *                 description: Optional job ID for targeted analysis
 *     responses:
 *       200:
 *         description: Resume analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     overallScore:
 *                       type: integer
 *                     sections:
 *                       type: object
 *                     recommendations:
 *                       type: array
 *                     keywords:
 *                       type: object
 *                     formatting:
 *                       type: object
 *       400:
 *         description: Resume text is required
 */
router.post('/analyze', ResumeBuilderController.analyzeResumeATS);

/**
 * @swagger
 * /api/resume-builder/keywords/{jobId}:
 *   get:
 *     summary: Extract keywords from job posting
 *     tags: [Resume Builder]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID to extract keywords from
 *     responses:
 *       200:
 *         description: Keywords extracted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 keywords:
 *                   type: object
 *                   properties:
 *                     technical:
 *                       type: array
 *                       items:
 *                         type: string
 *                     soft:
 *                       type: array
 *                       items:
 *                         type: string
 *                     action:
 *                       type: array
 *                       items:
 *                         type: string
 *                     requirements:
 *                       type: array
 *                       items:
 *                         type: string
 *                 job:
 *                   type: object
 *       404:
 *         description: Job not found
 */
router.get('/keywords/:jobId', ResumeBuilderController.extractJobKeywords);

/**
 * @swagger
 * /api/resume-builder/suggestions:
 *   post:
 *     summary: Generate intelligent content suggestions
 *     tags: [Resume Builder]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobTitle:
 *                 type: string
 *                 description: Target job title
 *               experience:
 *                 type: integer
 *                 description: Years of experience
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: User's skills
 *               industry:
 *                 type: string
 *                 description: Target industry
 *     responses:
 *       200:
 *         description: Content suggestions generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 suggestions:
 *                   type: object
 *                   properties:
 *                     bulletPoints:
 *                       type: array
 *                       items:
 *                         type: string
 *                     summaryTemplates:
 *                       type: array
 *                       items:
 *                         type: string
 *                     skillSuggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     actionVerbs:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post('/suggestions', ResumeBuilderController.generateContentSuggestions);

/**
 * @swagger
 * /api/resume-builder/templates:
 *   get:
 *     summary: Get available resume templates
 *     tags: [Resume Builder]
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       preview:
 *                         type: string
 *                       atsScore:
 *                         type: integer
 *                       features:
 *                         type: array
 *                         items:
 *                           type: string
 */
router.get('/templates', ResumeBuilderController.getTemplates);

// AI-powered optimization routes
/**
 * @swagger
 * /api/resume-builder/optimize/bullet:
 *   post:
 *     summary: Optimize bullet point using AI
 *     tags: [Resume Builder - AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentBullet
 *             properties:
 *               currentBullet:
 *                 type: string
 *                 description: Current bullet point to optimize
 *               jobTitle:
 *                 type: string
 *                 description: Target job title
 *               company:
 *                 type: string
 *                 description: Target company
 *               jobSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Required job skills
 *     responses:
 *       200:
 *         description: Bullet point optimized successfully
 */
router.post('/optimize/bullet', ResumeBuilderController.optimizeBulletPoint);

/**
 * @swagger
 * /api/resume-builder/optimize/summary:
 *   post:
 *     summary: Optimize summary using AI
 *     tags: [Resume Builder - AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentSummary
 *             properties:
 *               currentSummary:
 *                 type: string
 *                 description: Current summary to optimize
 *               jobTitle:
 *                 type: string
 *                 description: Target job title
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: User's skills
 *               experience:
 *                 type: integer
 *                 description: Years of experience
 *     responses:
 *       200:
 *         description: Summary optimized successfully
 */
router.post('/optimize/summary', ResumeBuilderController.optimizeSummary);

/**
 * @swagger
 * /api/resume-builder/ai/skills:
 *   post:
 *     summary: Get AI-powered skill suggestions
 *     tags: [Resume Builder - AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Current user skills
 *               jobTitle:
 *                 type: string
 *                 description: Target job title
 *               industry:
 *                 type: string
 *                 description: Target industry
 *     responses:
 *       200:
 *         description: Skill suggestions generated successfully
 */
router.post('/ai/skills', isLoggedIn, ResumeBuilderController.getSkillSuggestions);

/**
 * @swagger
 * /api/resume-builder/generate/cover-letter:
 *   post:
 *     summary: Generate cover letter using AI
 *     tags: [Resume Builder - AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resumeData
 *               - jobTitle
 *               - company
 *             properties:
 *               resumeData:
 *                 type: object
 *                 description: Complete resume data
 *               jobTitle:
 *                 type: string
 *                 description: Target job title
 *               company:
 *                 type: string
 *                 description: Target company
 *               jobDescription:
 *                 type: string
 *                 description: Job description (optional)
 *     responses:
 *       200:
 *         description: Cover letter generated successfully
 */
router.post('/generate/cover-letter', isLoggedIn, ResumeBuilderController.generateCoverLetter);

/**
 * @swagger
 * /api/resume-builder/jobs:
 *   get:
 *     summary: Get available jobs for optimization targeting
 *     tags: [Resume Builder - Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of jobs to return
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 */
router.get('/jobs/available', ResumeBuilderController.getAvailableJobs);

/**
 * @swagger
 * /api/resume-builder/jobs/search:
 *   get:
 *     summary: Search jobs for optimization targeting
 *     tags: [Resume Builder - Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Jobs found successfully
 */
router.get('/jobs/search', isLoggedIn, ResumeBuilderController.searchJobs);

module.exports = router;
