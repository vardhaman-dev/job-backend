const { validationResult } = require('express-validator');
const { User, CompanyProfile, JobSeekerProfile, sequelize } = require('../models');
const BaseAuthController = require('./baseAuthController');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UnifiedAuthController extends BaseAuthController {
  /**
   * Unified login for both job seekers and companies
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Find user with the appropriate profile based on role
      const user = await User.scope('withPassword').findOne({
        where: { 
          email,
          status: 'active',
          role: ['job_seeker', 'company']
        },
        include: [
          {
            model: JobSeekerProfile,
            as: 'jobSeekerProfile',
            required: false
          },
          {
            model: CompanyProfile,
            as: 'companyProfile',
            required: false
          }
        ]
      });

      // Check if user exists and password is correct
      if (!user || !(await user.validPassword(password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Determine the profile type and call the appropriate success handler
      if (user.role === 'job_seeker' && user.jobSeekerProfile) {
        return this.handleSuccessfulAuth(res, user, 'jobSeeker');
      } else if (user.role === 'company' && user.companyProfile) {
        return this.handleSuccessfulAuth(res, user, 'company');
      } else {
        // User exists but profile is missing
        return res.status(500).json({
          success: false,
          message: 'User profile not found',
          error: 'Profile data is missing for this user'
        });
      }

    } catch (error) {
      console.error('Login error:', error);
      return this.handleAuthError(res, error);
    }
  }

  /**
   * Unified registration for both job seekers and companies
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { email, password, name, role, ...profileData } = req.body;

      // Check if email exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }

      // Create user
      const user = await User.create({
        email,
        password_hash: password, // Will be hashed by the model hook
        name: name || email.split('@')[0],
        role,
        status: 'active'
      }, { transaction });

      // Create appropriate profile based on role
      if (role === 'company') {
        const { companyName, contactNumber, website, description, industry, location } = profileData;
        await CompanyProfile.create({
          user_id: user.id,
          company_name: companyName,
          contact_number: contactNumber,
          website,
          description,
          industry,
          location
        }, { transaction });
      } else if (role === 'job_seeker') {
        const { resumeLink, experienceYears, skills = [] } = profileData;
        await JobSeekerProfile.create({
          user_id: user.id,
          resume_link: resumeLink,
          experience_years: experienceYears || 0,
          skills_json: skills
        }, { transaction });
      } else {
        throw new Error('Invalid role');
      }

      await transaction.commit();

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Get user data without password
      const userData = await User.findByPk(user.id, {
        attributes: { exclude: ['password_hash'] },
        include: [
          {
            model: role === 'company' ? CompanyProfile : JobSeekerProfile,
            as: role === 'company' ? 'companyProfile' : 'jobSeekerProfile',
            attributes: { exclude: ['user_id'] }
          }
        ]
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        data: userData
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error during registration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

// Create and configure an instance of the controller
const unifiedAuthController = new UnifiedAuthController();
unifiedAuthController.sequelize = sequelize; // Add sequelize instance to the controller

// Export the login method for use in routes
const login = (req, res) => unifiedAuthController.login(req, res);

module.exports = {
  login,
  register: (req, res) => unifiedAuthController.register(req, res)
};
