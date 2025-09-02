// controllers/companyController.js
const CompanyProfile = require('../models/CompanyProfile');
const { Op } = require('sequelize');
const User = require('../models/User');
const { JobApplication ,Job ,CompanyReview, Report,ReportCounter} = require('../models');
const db = require('../models');
exports.getCompanyWithUserInfo = async (req, res) => {
  try {
    const { user_id } = req.params;

    const company = await CompanyProfile.findOne({
      where: { userId: user_id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role', 'status']
        }
      ]
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
};


// UPDATE company profile
exports.updateCompanyProfile = async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      companyName,
      contactNumber,
      logo,
      website,
      description,
      industry,
      location,
      positionsAvailable,
      numberOfEmployees
    } = req.body;

    const company = await CompanyProfile.findOne({ where: { userId: user_id } });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    await company.update({
      companyName,
      contactNumber,
      logo,
      website,
      description,
      industry,
      location,
      positionsAvailable,
      numberOfEmployees
    });

    res.json({ success: true, message: 'Company updated successfully', company });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
exports.getEmployerStatus = async (req, res) => {
  try {
    console.log('--- getEmployerStatus called ---');

    const user = req.user; // set by isLoggedIn middleware
    console.log('[getEmployerStatus] req.user:', user);

    if (!user) {
      console.log('[getEmployerStatus] No user found in req.user');
      return res.status(401).json({ status: 'unknown', rejectionReason: '' });
    }

    console.log('[getEmployerStatus] Searching for company profile with userId =', user.id);
    const company = await CompanyProfile.findOne({
      where: { userId: user.id }, // Sequelize maps to user_id
      attributes: ['status', 'rejectionReason'] // Sequelize maps to rejection_reason
    });

    if (!company) {
      console.log('[getEmployerStatus] No company found for userId =', user.id);
      return res.status(404).json({ status: 'unknown', rejectionReason: '' });
    }

    console.log('[getEmployerStatus] Company found:', company.toJSON());

    return res.json({
      status: company.status,
      rejectionReason: company.rejectionReason || ''
    });
  } catch (err) {
    console.error('[getEmployerStatus] Error:', err);
    return res.status(500).json({ status: 'unknown', rejectionReason: '' });
  }
};

exports.reportCompany = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { companyId } = req.params;
    const { comment } = req.body;
    const reporterId = req.user.id;

    // Validate input
    if (!comment || comment.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Comment is required'
      });
    }

    // Check if company exists
    const company = await CompanyProfile.findByPk(companyId, { transaction });
    if (!company) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    try {
      // Check if user already reported this company recently (within last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const recentReport = await Report.findOne({
        where: {
          reporter_id: reporterId,
          target_type: 'company',
          target_id: companyId,
          created_at: {
            [Op.gte]: oneDayAgo
          }
        },
        transaction
      });

      if (recentReport) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'You have already reported this company recently. Please wait 24 hours before submitting another report.'
        });
      }

      // Create the report
      const report = await Report.create({
        reporter_id: reporterId,
        target_type: 'company',
        target_id: companyId,
        comment: comment.trim(),
        status: 'open',
        created_at: new Date()
      }, { transaction });

      // Update or create report counter
      const [counter, created] = await ReportCounter.findOrCreate({
        where: {
          target_type: 'company',
          target_id: companyId
        },
        defaults: {
          report_count: 1,
          last_report_at: new Date()
        },
        transaction
      });

      if (!created) {
        await counter.increment('report_count', { by: 1, transaction });
        counter.last_report_at = new Date();
        await counter.save({ transaction });
      }

      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: 'Report submitted successfully',
        report: {
          id: report.id,
          target_type: report.target_type,
          target_id: report.target_id,
          status: report.status,
          created_at: report.created_at
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error in report creation:', error);
      throw error;
    }

  } catch (error) {
    await transaction.rollback();
    console.error('Error reporting company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit report',
      error: error.message
    });
  }
};

exports.getCompanyStats = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Check if the company exists
    const company = await CompanyProfile.findByPk(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get total jobs posted by the company
    const totalJobs = await Job.count({
      where: { company_id: companyId }
    });

    // Get active jobs (status = 'open')
    const activeJobs = await Job.count({
      where: { 
        company_id: companyId,
        status: 'open' 
      }
    });

    // Get total applicants for all company's jobs
    const totalApplicants = await JobApplication.count({
      include: [{
        model: Job,
        as: 'job',
        where: { company_id: companyId },
        attributes: []
      }],
      distinct: true,
      col: 'job_seeker_id'
    });

    // Get total reviews for the company
    const totalReviews = await CompanyReview.count({
      where: { 
        company_id: companyId,
        visible: true 
      }
    });

    // Get total reports against the company
    const totalReports = await Report.count({
      where: { 
        target_id: companyId,
        target_type: 'company' 
      }
    });

    res.json({
      success: true,
      data: {
        totalJobs,
        activeJobs,
        totalApplicants,
        totalReviews,
        totalReports
      }
    });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching company statistics',
      error: error.message 
    });
  }
};