const { validationResult } = require('express-validator');
const { User, CompanyProfile, CompanyVerification, sequelize, AdminLog } = require('../../models');

class CompanyVerificationController {
  /**
   * Get list of pending company verifications
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPendingCompanies(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // First, get the company profiles with pending status
      const { count, rows: companies } = await CompanyProfile.findAndCountAll({
        where: { status: 'pending' },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'name']
          }
        ],
        attributes: [
          'user_id', 'company_name', 'website', 'contact_number', 'description',
          'industry', 'location', 'submitted_at', 'status'
        ],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [['submitted_at', 'ASC']]
      });
      
      // Get the latest verification record for each company
      const companyIds = companies.map(c => c.user_id);
      const verifications = await CompanyVerification.findAll({
        where: {
          companyId: companyIds,
          status: 'pending'
        },
        order: [['submitted_at', 'DESC']]
      });

      // Map verifications to companies
      const companyVerifications = {};
      verifications.forEach(v => {
        if (!companyVerifications[v.companyId]) {
          companyVerifications[v.companyId] = v;
        }
      });

      // Combine company data with verification data
      const result = companies.map(company => ({
        ...company.get({ plain: true }),
        id: company.user_id, // Ensure we have an id field for the frontend
        verification: companyVerifications[company.user_id] || null
      }));

      console.log('Found pending companies:', result.length);
      if (result.length > 0) {
        console.log('Sample company data:', JSON.stringify(result[0], null, 2));
      }

      return res.json({
        success: true,
        data: result,
        pagination: {
          total: count,
          page: parseInt(page, 10),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching pending companies:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pending companies',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Approve a company verification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async approveCompany(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { companyId } = req.params;
      const adminId = req.user.id;

      // Find the company profile
      const companyProfile = await CompanyProfile.findOne({
        where: { userId: companyId },
        transaction
      });

      if (!companyProfile) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Update company profile
      await companyProfile.update({
        status: 'approved',
        verifiedAt: new Date(),
        verifiedBy: adminId,
        rejectionReason: null
      }, { transaction });

      // Create verification record
      await CompanyVerification.create({
        companyId,
        status: 'approved',
        verifiedAt: new Date(),
        verifiedBy: adminId
      }, { transaction });

      // Log the action
      await AdminLog.create({
        adminId: adminId,
        action: 'company_approved',
        details: `Approved company: ${companyProfile.companyName} (ID: ${companyId})`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
        status: 'success'
      }, { transaction });

      await transaction.commit();

      return res.json({
        success: true,
        message: 'Company approved successfully'
      });
    } catch (error) {
      if (transaction.finished !== 'commit') {
        await transaction.rollback();
      }
      
      console.error('Error approving company:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to approve company',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Reject a company verification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async rejectCompany(req, res) {
    console.log('Starting rejectCompany with params:', req.params, 'body:', req.body);
    const transaction = await sequelize.transaction();
    
    try {
      const { companyId } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.id;

      console.log('Processing rejection for company:', companyId, 'by admin:', adminId, 'reason:', reason);

      if (!reason || reason.trim().length === 0) {
        console.log('Rejection reason is required');
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      // Find the company profile
      console.log('Looking up company profile for user ID:', companyId);
      const companyProfile = await CompanyProfile.findOne({
        where: { userId: companyId },
        transaction,
        raw: true // Get plain object instead of model instance
      });

      console.log('Company profile found:', companyProfile);

      if (!companyProfile) {
        console.log('Company not found for ID:', companyId);
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Update company profile
      console.log('Updating company profile status to rejected');
      await CompanyProfile.update({
        status: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: adminId,
        rejectionReason: reason
      }, {
        where: { userId: companyId },
        transaction
      });

      // Create verification record
      console.log('Creating verification record');
      await CompanyVerification.create({
        companyId,
        status: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: adminId,
        rejectionReason: reason
      }, { transaction });

      // Log the action
      const logData = {
        admin_id: adminId, // Using database column name
        action: 'COMPANY_REJECTED',
        status: 'success',
        details: `Rejected company: ${companyProfile.companyName || 'Unknown'}. Reason: ${reason}`,
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || ''
      };
      
      console.log('Creating AdminLog with data:', JSON.stringify(logData, null, 2));
      
      try {
        const log = await AdminLog.create(logData, { transaction });
        console.log('AdminLog created successfully:', log.id);
      } catch (logError) {
        console.error('Error creating AdminLog:', logError);
        console.error('Log error details:', {
          name: logError.name,
          message: logError.message,
          errors: logError.errors?.map(e => ({
            message: e.message,
            type: e.type,
            path: e.path,
            value: e.value
          }))
        });
        throw logError; // Re-throw to be caught by the outer catch
      }

      console.log('Committing transaction');
      await transaction.commit();

      return res.json({
        success: true,
        message: 'Company rejected successfully'
      });
    } catch (error) {
      console.error('Error in rejectCompany:', error);
      
      if (transaction.finished !== 'commit') {
        console.log('Rolling back transaction');
        await transaction.rollback().catch(e => {
          console.error('Error rolling back transaction:', e);
        });
      }
      
      const errorResponse = {
        success: false,
        message: 'Failed to reject company',
        error: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        validationErrors: error.errors?.map(e => ({
          message: e.message,
          type: e.type,
          path: e.path,
          value: e.value
        }))
      };
      
      console.error('Sending error response:', JSON.stringify(errorResponse, null, 2));
      
      return res.status(500).json(errorResponse);
    }
  }

  /**
   * Get company verification history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getVerificationHistory(req, res) {
    try {
      const { companyId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: verifications } = await CompanyVerification.findAndCountAll({
        where: { companyId },
        include: [
          {
            model: User,
            as: 'verifiedByAdmin',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['verifiedAt', 'DESC']],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      return res.json({
        success: true,
        data: verifications,
        pagination: {
          total: count,
          page: parseInt(page, 10),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching verification history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch verification history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new CompanyVerificationController();
