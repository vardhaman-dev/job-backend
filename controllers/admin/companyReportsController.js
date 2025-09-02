const { sequelize } = require('../../models');

/**
 * @swagger
 * components:
 *   schemas:
 *     ReportedCompany:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The user ID of the company
 *         companyName:
 *           type: string
 *           description: Name of the company
 *         email:
 *           type: string
 *           format: email
 *           description: Email address of the company
 *         contactNumber:
 *           type: string
 *           description: Contact number of the company
 *         reportCount:
 *           type: integer
 *           description: Number of reports against this company
 *         lastReportAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the last report
 */

/**
 * Get companies with 5 or more reports
 * @route GET /admin/companies/reports
 * @group Admin - Admin operations
 * @returns {Array.<ReportedCompany>} 200 - List of reported companies
 * @returns {Error}  401 - Unauthorized
 * @returns {Error}  403 - Forbidden
 * @security bearerAuth
 */
const getReportedCompanies = async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        u.id,
        cp.company_name as "companyName",
        u.email,
        cp.contact_number as "contactNumber",
        rc.report_count as "reportCount",
        rc.last_report_at as "lastReportAt"
      FROM users u
      INNER JOIN company_profiles cp ON u.id = cp.user_id
      INNER JOIN report_counters rc ON u.id = rc.target_id
      WHERE 
        rc.target_type = 'company' 
        AND rc.report_count >= 5
      ORDER BY rc.report_count DESC, rc.last_report_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching reported companies:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reported companies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getReportedCompanies
};
