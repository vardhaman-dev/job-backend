const { validationResult } = require('express-validator');
const { User, CompanyProfile, CompanyVerification, sequelize } = require('../models');
const BaseAuthController = require('./baseAuthController');

class CompanyAuthController extends BaseAuthController {
  /**
   * Register a new company
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const {
      companyName,
      email,
      password,
      contactNumber,
      website,
      logo,
      description,
      industry,
      location,
      companySize,
      foundedYear,
      linkedinUrl,
      twitterHandle
    } = req.body;

    // Start a transaction to ensure data consistency
    const transaction = await sequelize.transaction();

    try {
      // Check if email already exists
      const existingUser = await User.findOne({
        where: { email },
        transaction
      });

      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }

      // Create user
      const user = await User.create({
        email,
        password_hash: password, // Will be hashed by the model hook
        name: companyName,
        role: 'company',
        status: 'active'
      }, { transaction });

      // Format twitter handle to ensure it starts with @
      const formattedTwitterHandle = twitterHandle 
        ? twitterHandle.startsWith('@') 
          ? twitterHandle 
          : `@${twitterHandle}`
        : null;

      // Create company profile with verification status
      const companyProfile = await CompanyProfile.create({
        userId: user.id,
        companyName,
        contactNumber,
        website,
        logo,
        description,
        industry,
        location,
        companySize,
        foundedYear: foundedYear ? parseInt(foundedYear, 10) : null,
        linkedinUrl,
        twitterHandle: formattedTwitterHandle,
        status: 'pending',
        submittedAt: new Date()
      }, { transaction });

      // Create initial verification record
      await CompanyVerification.create({
        companyId: user.id,
        status: 'pending',
        submittedAt: new Date()
      }, { transaction });

      // Commit the transaction
      await transaction.commit();

      // Get the user with profile and verification status for response
      const userWithProfile = await User.findByPk(user.id, {
        include: [
          {
            model: CompanyProfile,
            as: 'companyProfile',
            attributes: { 
              exclude: ['userId', 'createdAt', 'updatedAt'],
              include: ['status', 'submittedAt', 'verifiedAt']
            }
          },
          {
            model: CompanyVerification,
            as: 'verifications',
            limit: 1,
            order: [['submittedAt', 'DESC']],
            attributes: ['status', 'submittedAt', 'verifiedAt', 'rejectionReason']
          }
        ],
        attributes: { exclude: ['password_hash', 'createdAt', 'updatedAt'] }
      });

      // Generate JWT token
      const token = this.generateToken(user);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        data: userWithProfile
      });

    } catch (error) {
      // Rollback the transaction in case of error
      if (transaction.finished !== 'commit') {
        await transaction.rollback();
      }
      
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Login a company
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    try {
      const { email, password } = req.body;

      // Find user with company profile
      const user = await User.scope('withPassword').findOne({
        where: { 
          email,
          role: 'company',
          status: 'active'
        },
        include: [{
          model: CompanyProfile,
          as: 'companyProfile',
          required: true
        }]
      });

      // Check if user exists and password is correct
      if (!user || !(await user.validPassword(password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = this.generateToken(user);

      // Prepare user data for response (exclude sensitive info)
      const userData = user.get({ plain: true });
      delete userData.password_hash;
      
      if (userData.companyProfile) {
        delete userData.companyProfile.userId;
      }

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        data: userData
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

const companyAuthController = new CompanyAuthController();

// Export individual methods for use in routes
const registerCompany = (req, res) => companyAuthController.register(req, res);
const loginCompany = (req, res) => companyAuthController.login(req, res);

module.exports = {
  registerCompany,
  loginCompany
};
