const express = require('express');
const router = express.Router();
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');
const companyVerificationController = require('../controllers/admin/companyVerificationController');

/**
 * @swagger
 * /api/admin/companies/pending:
 *   get:
 *     summary: Get list of pending company verifications
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of pending companies
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/pending', isLoggedIn, isAdmin, companyVerificationController.getPendingCompanies);

/**
 * @swagger
 * /api/admin/companies/verified:
 *   get:
 *     summary: Get list of verified companies
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of verified companies
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/verified', isLoggedIn, isAdmin, companyVerificationController.getVerifiedCompanies);

/**
 * @swagger
 * /api/admin/companies/{id}/approve:
 *   post:
 *     summary: Approve a company verification
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the company to approve
 *     responses:
 *       200:
 *         description: Company approved successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
router.post('/:id/approve', isLoggedIn, isAdmin, companyVerificationController.approveCompany);

/**
 * @swagger
 * /api/admin/companies/{id}/reject:
 *   post:
 *     summary: Reject a company verification
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the company to reject
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *                 example: "Incomplete documentation"
 *     responses:
 *       200:
 *         description: Company rejected successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reject', isLoggedIn, isAdmin, companyVerificationController.rejectCompany);

/**
 * @swagger
 * /api/admin/companies/{id}/suspend:
 *   post:
 *     summary: Suspend an approved company
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the company to suspend
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for suspending the company
 *     responses:
 *       200:
 *         description: Company suspended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     companyId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     suspendedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request (e.g., missing reason)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
router.post('/:id/suspend', isLoggedIn, isAdmin, companyVerificationController.suspendCompany);

/**
 * @swagger
 * /api/admin/companies/{id}/ban:
 *   post:
 *     summary: Ban a company from the platform
 *     description: This action will ban the company, deactivate their account, and prevent them from logging in.
 *     tags: [Admin - Company Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the company to ban
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for banning the company
 *                 example: "Violation of terms of service"
 *     responses:
 *       200:
 *         description: Company banned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     companyId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       enum: [banned]
 *                     bannedAt:
 *                       type: string
 *                       format: date-time
 *                     reason:
 *                       type: string
 *       400:
 *         description: Bad request (e.g., missing reason)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
router.post('/:id/ban', isLoggedIn, isAdmin, companyVerificationController.banCompany);

module.exports = router;
