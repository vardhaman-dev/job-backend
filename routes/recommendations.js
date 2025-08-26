const express = require('express');
const router = express.Router();
const RecommendationController = require('../controllers/recommendationController');
const { isLoggedIn } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Get personalized job recommendations for the authenticated user
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recommendations to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Personalized job recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       company:
 *                         type: object
 *                       recommendationScore:
 *                         type: number
 *                       matchFactors:
 *                         type: object
 *                 pagination:
 *                   type: object
 *                 metadata:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User profile not found
 */
router.get('/', isLoggedIn, RecommendationController.getJobRecommendations);

/**
 * @swagger
 * /api/recommendations/trending:
 *   get:
 *     summary: Get trending jobs (most applied to recently)
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of trending jobs to return
 *     responses:
 *       200:
 *         description: List of trending jobs
 */
router.get('/trending', RecommendationController.getTrendingJobs);

/**
 * @swagger
 * /api/recommendations/similar/{jobId}:
 *   get:
 *     summary: Get jobs similar to a specific job
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the job to find similar jobs for
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of similar jobs to return
 *     responses:
 *       200:
 *         description: List of similar jobs
 *       404:
 *         description: Job not found
 */
router.get('/similar/:jobId', RecommendationController.getSimilarJobs.bind(RecommendationController));


module.exports = router;
