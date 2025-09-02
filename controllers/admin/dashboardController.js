const { User, CompanyProfile, Job, JobApplication, sequelize } = require('../../models');
const { Op, literal, col, fn } = require('sequelize');

// Raw SQL queries for reports since models aren't defined
const getReportCounts = async (targetType, minCount) => {
  const [results] = await sequelize.query(
    `SELECT COUNT(*) as count 
     FROM report_counters 
     WHERE target_type = ? AND report_count >= ?`,
    {
      replacements: [targetType, minCount],
      type: sequelize.QueryTypes.SELECT
    }
  );
  return results ? results.count : 0;
};

/**
 * Get dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardStats = async (req, res) => {
  try {
    console.log('Starting to fetch dashboard stats...');
    
    // Execute all required queries in parallel
    // Calculate date ranges
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // First get the basic counts
    const [
      totalUsers,
      jobSeekers,
      totalCompanies,
      pendingApprovals,
      activeUsersLast30Days,
      newSignupsLast7Days,
      activeJobListings,
      totalRejectedCompanies
    ] = await Promise.all([
      // Total users count
      User.count().catch(err => {
        console.error('Error counting total users:', err);
        throw err;
      }),
      
      // Job seekers count (users with role 'job_seeker')
      User.count({
        where: { role: 'job_seeker' }
      }).catch(err => {
        console.error('Error counting job seekers:', err);
        throw err;
      }),
      
      // Total companies count
      User.count({
        where: { role: 'company' }
      }).catch(err => {
        console.error('Error counting companies:', err);
        throw err;
      }),
      
      // Pending company approvals
      CompanyProfile.count({
        where: { status: 'pending' }
      }).catch(err => {
        console.error('Error counting pending approvals:', err);
        throw err;
      }),
      
      // Active users (users with status 'active')
      User.count({
        where: {
          status: 'active'
        }
      }).catch(err => {
        console.error('Error counting active users:', err);
        return 0; // Return 0 instead of failing the whole request
      }),
      
      // New signups (last 7 days)
      User.count({
        where: {
          created_at: {
            [Op.gte]: sevenDaysAgo
          }
        }
      }).catch(err => {
        console.error('Error counting new signups:', err);
        return 0;
      }),
      
      // Active job listings (not expired and status is 'open')
      Job.count({
        where: {
          status: 'open',
          [Op.or]: [
            { deadline: { [Op.gte]: new Date() } },
            { deadline: null }
          ]
        }
      }).catch(err => {
        console.error('Error counting active jobs:', err);
        return 0;
      }),
      
      // Total rejected companies
      CompanyProfile.count({
        where: { status: 'rejected' }
      }).catch(err => {
        console.error('Error counting rejected companies:', err);
        return 0;
      })
    ]);

    // Prepare response with only required fields
    // Get report counts in parallel
    const [
      companiesWith5PlusReports,
      jobSeekersWith5PlusReports
    ] = await Promise.all([
      getReportCounts('company', 5).catch(err => {
        console.error('Error getting companies with 5+ reports:', err);
        return 0;
      }),
      getReportCounts('job_seeker', 5).catch(err => {
        console.error('Error getting job seekers with 5+ reports:', err);
        return 0;
      })
    ]);

    // Return all statistics
    res.json({
      success: true,
      data: {
        // Basic stats
        totalUsers,
        jobSeekers,
        totalCompanies,
        pendingApprovals,
        
        // New metrics
        activeUsersLast30Days,
        newSignupsLast7Days,
        activeJobListings,
        totalRejectedCompanies,
        companiesWith5PlusReports,
        jobSeekersWith5PlusReports
      }
    });

  } catch (error) {
    console.error('Error in getDashboardStats:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.original) {
      console.error('Original error:', error.original);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        original: error.original
      } : undefined
    });
  }
};

module.exports = {
  getDashboardStats
};
