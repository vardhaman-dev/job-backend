const { sequelize } = require('../../models');

/**
 * @swagger
 * components:
 *   schemas:
 *     ReportedJobSeeker:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The user ID of the job seeker
 *         name:
 *           type: string
 *           description: Full name of the job seeker
 *         email:
 *           type: string
 *           format: email
 *           description: Email address of the job seeker
 *         reportCount:
 *           type: integer
 *           description: Number of reports against this job seeker
 *         lastReportAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the last report
 */

/**
 * Get job seekers with 3 or more reports
 * @route GET /admin/job_seekers/reports
 * @group Admin - Admin operations
 * @returns {Array.<ReportedJobSeeker>} 200 - List of reported job seekers
 * @returns {Error}  401 - Unauthorized
 * @returns {Error}  403 - Forbidden
 * @security bearerAuth
 */
const getReportedJobSeekers = async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        rc.report_count as "reportCount",
        rc.last_report_at as "lastReportAt"
      FROM users u
      INNER JOIN report_counters rc ON u.id = rc.target_id
      WHERE 
        rc.target_type = 'job_seeker' 
        AND rc.report_count >= 3
        AND u.role = 'job_seeker'
      ORDER BY 
        rc.report_count DESC, 
        rc.last_report_at DESC
    `);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching reported job seekers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getReportedJobSeekers
};
