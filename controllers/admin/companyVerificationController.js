const { validationResult } = require('express-validator');
const { Op, QueryTypes } = require('sequelize');
const db = require('../../models');
const { User, CompanyProfile, CompanyVerification, sequelize, AdminLog } = db;

// Verify models are loaded
if (!CompanyVerification) {
  console.error('CompanyVerification model not found in db:', Object.keys(db));
  process.exit(1);
}

class CompanyVerificationController {
  /**
   * Get list of companies by verification status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} status - Verification status ('pending' or 'verified')
   */
  getCompaniesByStatus = async (req, res, status = 'pending') => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const isPending = status === 'pending';
      const statusCondition = isPending ? 'pending' : 'approved';
      
      // For verified companies, we should ensure they have verification details
      const whereClause = isPending 
        ? 'cp.status = :status AND u.role = :role'
        : 'cp.status = :status AND u.role = :role AND cp.verified_at IS NOT NULL';
      
      // First, get the total count
      const [countResult] = await sequelize.query(
        `SELECT COUNT(*) as count 
         FROM company_profiles cp
         JOIN users u ON cp.user_id = u.id
         WHERE ${whereClause}`,
        { 
          replacements: { 
            status: statusCondition,
            role: 'company'
          },
          type: sequelize.QueryTypes.SELECT 
        }
      );
      
      const totalCount = countResult?.count || 0;

      // Then get the paginated results
      const results = await sequelize.query(
        `SELECT 
          cp.user_id as id,
          cp.company_name,
          u.email,
          u.name as contact_name,
          cp.contact_number,
          cp.website,
          cp.industry,
          cp.location,
          cp.description,
          cp.status,
          cp.submitted_at,
          cp.verified_at,
          cp.verified_by,
          cp.rejection_reason,
          admin.name as verified_by_name
        FROM company_profiles cp
        JOIN users u ON cp.user_id = u.id
        LEFT JOIN users admin ON cp.verified_by = admin.id
        WHERE ${whereClause}
        ORDER BY ${isPending ? 'cp.submitted_at' : 'cp.verified_at'} DESC
        LIMIT :limit OFFSET :offset`,
        {
          replacements: { 
            status: statusCondition,
            role: 'company',
            limit: parseInt(limit, 10), 
            offset: parseInt(offset, 10) 
          },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return res.json({
        success: true,
        data: results,
        pagination: {
          total: totalCount,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error(`Error fetching ${status} companies:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to fetch ${status} companies`,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get list of pending company verifications
   */
  getPendingCompanies = async (req, res) => {
    return this.getCompaniesByStatus(req, res, 'pending');
  }

  /**
   * Get list of verified companies
   */
  getVerifiedCompanies = async (req, res) => {
    return this.getCompaniesByStatus(req, res, 'approved');
  }

  /**
   * Approve a company verification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  approveCompany = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const companyId = req.params.id;
      const adminId = req.user.id;
      console.log('Starting approval for company ID:', companyId, 'by admin:', adminId);

      // Find the company profile
      const companyProfile = await CompanyProfile.findOne({
        where: { userId: companyId },
        transaction
      });

      console.log('Company profile found:', companyProfile ? companyProfile.toJSON() : 'Not found');

      if (!companyProfile) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Update company profile with database column names (snake_case)
      const updateData = {
        status: 'approved',
        verified_at: new Date(),
        verified_by: adminId,
        rejection_reason: null
      };
      
      console.log('Attempting to update with data:', updateData);
      
      // Use raw SQL to ensure column names match exactly
      const [updateCount] = await sequelize.query(
        `UPDATE company_profiles 
         SET status = 'approved', 
             verified_at = NOW(), 
             verified_by = :adminId, 
             rejection_reason = NULL 
         WHERE user_id = :companyId`,
        {
          replacements: { companyId, adminId },
          transaction
        }
      );
      
      console.log('Update result - Rows affected:', updateCount);

      if (updateCount === 0) {
        throw new Error('No rows were updated');
      }

      // Create verification record with correct column names
      console.log('Creating verification record...');
      await sequelize.query(
        `INSERT INTO company_verifications 
         (company_id, status, verified_at, verified_by, submitted_at) 
         VALUES (:companyId, 'approved', NOW(), :adminId, NOW())`,
        {
          replacements: { companyId, adminId },
          transaction
        }
      );

      // Log the action using the model to handle field mappings
      console.log('Creating admin log...');
      try {
        await AdminLog.create({
          adminId: adminId,
          action: 'COMPANY_APPROVED',
          details: `Approved company: ${companyProfile.companyName} (ID: ${companyId})`,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || null,
          status: 'success'
        }, { transaction });
      } catch (logError) {
        console.error('Error creating admin log:', logError);
        throw logError;
      }

      console.log('Committing transaction...');
      await transaction.commit();
      console.log('Transaction committed successfully');

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
  /**
   * Suspend an approved company by changing its status to pending
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  suspendCompany = async (req, res) => {
    console.log('Starting suspendCompany with params:', req.params, 'body:', req.body);
    const transaction = await sequelize.transaction();
    
    try {
      const companyId = req.params.id;
      const { reason } = req.body;
      const adminId = req.user?.id;

      console.log('Processing suspension for company:', companyId, 'by admin:', adminId, 'reason:', reason);

      if (!reason || reason.trim().length === 0) {
        console.log('Suspension reason is required');
        return res.status(400).json({
          success: false,
          message: 'Suspension reason is required'
        });
      }

      // Find company profile
      console.log('Finding company profile...');
      const [companyProfile] = await sequelize.query(
        'SELECT * FROM company_profiles WHERE user_id = :companyId',
        {
          replacements: { companyId },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log('Company profile found:', companyProfile || 'Not found');

      if (!companyProfile) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Update company profile to pending status
      console.log('Updating company profile to suspended status...');
      const [updateCount] = await sequelize.query(
        `UPDATE company_profiles 
         SET status = 'pending', 
             verified_at = NULL, 
             verified_by = NULL, 
             rejection_reason = :reason 
         WHERE user_id = :companyId`,
        {
          replacements: { companyId, reason },
          transaction
        }
      );

      console.log('Company profile update - Rows affected:', updateCount);

      if (updateCount === 0) {
        throw new Error('No rows were updated in company_profiles');
      }

      // Create verification record for suspension
      console.log('Creating suspension verification record...');
      await sequelize.query(
        `INSERT INTO company_verifications 
         (company_id, status, verified_at, verified_by, submitted_at, rejection_reason) 
         VALUES (:companyId, 'pending', NOW(), :adminId, NOW(), :reason)`,
        {
          replacements: { companyId, adminId, reason },
          transaction
        }
      );

      // Log the action
      console.log('Creating admin log...');
      try {
        await AdminLog.create({
          adminId: adminId,
          action: 'COMPANY_SUSPENDED',
          details: `Suspended company: ${companyProfile.company_name || 'Unknown Company'} (ID: ${companyId}). Reason: ${reason}`,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || null,
          status: 'success'
        }, { transaction });
      } catch (logError) {
        console.error('Error creating admin log:', logError);
        throw logError;
      }

      console.log('Committing transaction...');
      await transaction.commit();
      console.log('Transaction committed successfully');

      return res.json({
        success: true,
        message: 'Company suspended and moved to pending status',
        data: {
          companyId,
          status: 'pending',
          suspendedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error in suspendCompany:', error);
      
      if (transaction.finished !== 'commit') {
        console.log('Rolling back transaction');
        await transaction.rollback().catch(e => {
          console.error('Error rolling back transaction:', e);
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to suspend company',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };

  /**
   * Reject a company verification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  rejectCompany = async (req, res) => {
    console.log('Starting rejectCompany with params:', req.params, 'body:', req.body);
    const transaction = await sequelize.transaction();
    
    try {
      const companyId = req.params.id;
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

      // Find company profile
      console.log('Finding company profile...');
      const [companyProfile] = await sequelize.query(
        'SELECT * FROM company_profiles WHERE user_id = :companyId',
        {
          replacements: { companyId },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log('Company profile found:', companyProfile || 'Not found');

      if (!companyProfile) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Update company profile
      console.log('Updating company profile...');
      const [updateCount] = await sequelize.query(
        `UPDATE company_profiles 
         SET status = 'rejected', 
             verified_at = NOW(), 
             verified_by = :adminId, 
             rejection_reason = :reason 
         WHERE user_id = :companyId`,
        {
          replacements: { companyId, adminId, reason },
          transaction
        }
      );

      console.log('Company profile update - Rows affected:', updateCount);

      if (updateCount === 0) {
        throw new Error('No rows were updated in company_profiles');
      }

      // Create verification record
      console.log('Creating verification record...');
      await sequelize.query(
        `INSERT INTO company_verifications 
         (company_id, status, verified_at, verified_by, submitted_at, rejection_reason) 
         VALUES (:companyId, 'rejected', NOW(), :adminId, NOW(), :reason)`,
        {
          replacements: { companyId, adminId, reason },
          transaction
        }
      );

      // Log the action using the model to handle field mappings
      console.log('Creating admin log...');
      try {
        await AdminLog.create({
          adminId: adminId,
          action: 'COMPANY_REJECTED',
          details: `Rejected company: ${companyProfile.company_name || 'Unknown Company'} (ID: ${companyId}). Reason: ${reason}`,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || null,
          status: 'success'
        }, { transaction });
      } catch (logError) {
        console.error('Error creating admin log:', logError);
        throw logError;
      }

      console.log('Committing transaction...');
      await transaction.commit();
      console.log('Transaction committed successfully');

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
   * Ban a company, preventing them from using the platform
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  banCompany = async (req, res) => {
    console.log('Starting banCompany with params:', req.params, 'body:', req.body);
    const transaction = await sequelize.transaction();
    
    try {
      const companyId = req.params.id;
      const { reason } = req.body;
      const adminId = req.user?.id;

      console.log('Processing ban for company:', companyId, 'by admin:', adminId, 'reason:', reason);

      if (!reason || reason.trim().length === 0) {
        console.log('Ban reason is required');
        return res.status(400).json({
          success: false,
          message: 'Ban reason is required'
        });
      }

      // Find company profile and associated user
      console.log('Finding company profile and user...');
      const [companyProfile] = await sequelize.query(
        `SELECT cp.*, u.id as user_id, u.email 
         FROM company_profiles cp 
         JOIN users u ON cp.user_id = u.id 
         WHERE cp.user_id = :companyId`,
        {
          replacements: { companyId },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log('Company profile found:', companyProfile || 'Not found');

      if (!companyProfile) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Update company profile to rejected status (same as reject but with additional ban actions)
      console.log('Updating company profile to rejected status (ban)...');
      const [updateCount] = await sequelize.query(
        `UPDATE company_profiles 
         SET status = 'rejected', 
             verified_at = NOW(), 
             verified_by = :adminId, 
             rejection_reason = :reason 
         WHERE user_id = :companyId`,
        {
          replacements: { companyId, adminId, reason },
          transaction
        }
      );

      console.log('Company profile update - Rows affected:', updateCount);

      if (updateCount === 0) {
        throw new Error('No rows were updated in company_profiles');
      }

      // Deactivate the user account
      console.log('Deactivating user account...');
      await sequelize.query(
        `UPDATE users 
         SET is_active = false 
         WHERE id = :companyId`,
        {
          replacements: { companyId },
          transaction
        }
      );

      // Create verification record for ban (but with status 'rejected')
      console.log('Creating ban verification record...');
      await sequelize.query(
        `INSERT INTO company_verifications 
         (company_id, status, verified_at, verified_by, submitted_at, rejection_reason) 
         VALUES (:companyId, 'rejected', NOW(), :adminId, NOW(), :reason)`,
        {
          replacements: { companyId, adminId, reason },
          transaction
        }
      );

      // Log the action
      console.log('Creating admin log...');
      try {
        await AdminLog.create({
          adminId: adminId,
          action: 'COMPANY_BANNED',
          details: `Banned company: ${companyProfile.company_name || 'Unknown Company'} (ID: ${companyId}). Reason: ${reason}`,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || null,
          status: 'success'
        }, { transaction });
      } catch (logError) {
        console.error('Error creating admin log:', logError);
        throw logError;
      }

      console.log('Committing transaction...');
      await transaction.commit();
      console.log('Transaction committed successfully');

      return res.json({
        success: true,
        message: 'Company banned successfully',
        data: {
          companyId,
          status: 'rejected',
          bannedAt: new Date().toISOString(),
          reason
        }
      });
    } catch (error) {
      console.error('Error in banCompany:', error);
      
      if (transaction.finished !== 'commit') {
        console.log('Rolling back transaction');
        await transaction.rollback().catch(e => {
          console.error('Error rolling back transaction:', e);
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to ban company',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get verification history for a company
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getVerificationHistory = async (req, res) => {
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
