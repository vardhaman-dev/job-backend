const { User, Job, JobSeekerProfile, CompanyProfile, JobApplication } = require('../models');
const { Op } = require('sequelize');

class RecommendationController {
  /**
   * Get personalized job recommendations for a job seeker
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getJobRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      // Get user profile with skills and preferences
      const userProfile = await JobSeekerProfile.findOne({
        where: { userId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['name', 'email']
        }]
      });

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      // Get user's applied jobs to exclude from recommendations
      const appliedJobs = await JobApplication.findAll({
        where: { job_seeker_id: userId },
        attributes: ['job_id']
      });
      const appliedJobIds = appliedJobs.map(app => app.job_id);

      // Parse user skills
      let userSkills = [];
      try {
        userSkills = userProfile.skillsJson || [];
        if (typeof userSkills === 'string') {
          userSkills = JSON.parse(userSkills);
        }
      } catch (error) {
        console.error('Error parsing user skills:', error);
        userSkills = [];
      }

      // Calculate recommendations using multiple factors
      const recommendations = await this.calculateJobRecommendations({
        userId,
        userSkills,
        experienceYears: userProfile.experienceYears || 0,
        appliedJobIds,
        limit: limit * 2, // Get more jobs to rank and filter
        userLocation: userProfile.address
      });

      // Slice to requested limit after ranking
      const finalRecommendations = recommendations.slice(offset, offset + limit);

      // Get total count for pagination
      const totalJobs = await Job.count({
        where: {
          id: { [Op.notIn]: appliedJobIds },
          status: 'open'
        }
      });

      res.json({
        success: true,
        recommendations: finalRecommendations,
        pagination: {
          page,
          limit,
          total: Math.min(recommendations.length, totalJobs),
          totalPages: Math.ceil(Math.min(recommendations.length, totalJobs) / limit)
        },
        metadata: {
          userSkills,
          experienceYears: userProfile.experienceYears || 0,
          totalAppliedJobs: appliedJobIds.length
        }
      });

    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate recommendations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Calculate job recommendations based on various factors
   * @param {Object} params - Recommendation parameters
   * @returns {Array} Sorted array of recommended jobs
   */
  static async calculateJobRecommendations({
    userId,
    userSkills,
    experienceYears,
    appliedJobIds,
    limit,
    userLocation
  }) {
    // Get all open jobs with company information
    const jobs = await Job.findAll({
      where: {
        id: { [Op.notIn]: appliedJobIds },
        status: 'open',
        deadline: {
          [Op.or]: [
            { [Op.gte]: new Date() },
            { [Op.is]: null }
          ]
        }
      },
      include: [{
        model: CompanyProfile,
        as: 'company',
        attributes: ['companyName', 'industry', 'location', 'companySize']
      }],
      limit: limit || 50
    });

    // Calculate recommendation score for each job
    const scoredJobs = jobs.map(job => {
      const score = this.calculateJobScore({
        job,
        userSkills,
        experienceYears,
        userLocation
      });

      return {
        ...job.toJSON(),
        recommendationScore: score.total,
        matchFactors: score.factors
      };
    });

    // Sort by recommendation score (highest first)
    return scoredJobs.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  /**
   * Calculate recommendation score for a single job
   * @param {Object} params - Job scoring parameters
   * @returns {Object} Score breakdown
   */
  static calculateJobScore({ job, userSkills, experienceYears, userLocation }) {
    let score = 0;
    const factors = {};

    // Parse job skills
    let jobSkills = [];
    try {
      if (job.skills) {
        jobSkills = typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills;
      }
    } catch (error) {
      jobSkills = [];
    }

    // 1. Skills Match (40% weight)
    const skillsMatch = this.calculateSkillsMatch(userSkills, jobSkills);
    const skillsScore = skillsMatch * 40;
    score += skillsScore;
    factors.skillsMatch = {
      score: skillsScore,
      percentage: skillsMatch,
      matchedSkills: this.getMatchedSkills(userSkills, jobSkills)
    };

    // 2. Experience Level Match (25% weight)
    const experienceMatch = this.calculateExperienceMatch(experienceYears, job);
    const experienceScore = experienceMatch * 25;
    score += experienceScore;
    factors.experienceMatch = {
      score: experienceScore,
      percentage: experienceMatch,
      userYears: experienceYears,
      jobType: job.type
    };

    // 3. Location Preference (15% weight)
    const locationMatch = this.calculateLocationMatch(userLocation, job.location, job.type);
    const locationScore = locationMatch * 15;
    score += locationScore;
    factors.locationMatch = {
      score: locationScore,
      percentage: locationMatch,
      jobLocation: job.location,
      jobType: job.type
    };

    // 4. Job Recency (10% weight)
    const recencyMatch = this.calculateRecencyScore(job.posted_at);
    const recencyScore = recencyMatch * 10;
    score += recencyScore;
    factors.recencyMatch = {
      score: recencyScore,
      percentage: recencyMatch,
      postedAt: job.posted_at
    };

    // 5. Company Industry Bonus (10% weight)
    const industryBonus = this.calculateIndustryBonus(job.company);
    score += industryBonus;
    factors.industryBonus = {
      score: industryBonus,
      industry: job.company?.industry
    };

    return {
      total: Math.round(score * 100) / 100,
      factors
    };
  }

  /**
   * Calculate skills match percentage
   */
  static calculateSkillsMatch(userSkills, jobSkills) {
    if (!userSkills.length || !jobSkills.length) return 0;

    const normalizedUserSkills = userSkills.map(skill => skill.toLowerCase().trim());
    const normalizedJobSkills = jobSkills.map(skill => skill.toLowerCase().trim());

    const matchedSkills = normalizedUserSkills.filter(userSkill =>
      normalizedJobSkills.some(jobSkill =>
        jobSkill.includes(userSkill) || userSkill.includes(jobSkill)
      )
    );

    return matchedSkills.length / jobSkills.length;
  }

  /**
   * Get list of matched skills
   */
  static getMatchedSkills(userSkills, jobSkills) {
    if (!userSkills.length || !jobSkills.length) return [];

    const normalizedUserSkills = userSkills.map(skill => skill.toLowerCase().trim());
    const normalizedJobSkills = jobSkills.map(skill => skill.toLowerCase().trim());

    return jobSkills.filter(jobSkill =>
      normalizedUserSkills.some(userSkill =>
        userSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(userSkill.toLowerCase())
      )
    );
  }

  /**
   * Calculate experience level match
   */
  static calculateExperienceMatch(userExperience, job) {
    // Experience level mapping
    const experienceLevels = {
      'internship': { min: 0, max: 1 },
      'entry': { min: 0, max: 2 },
      'mid': { min: 2, max: 5 },
      'senior': { min: 5, max: 10 },
      'lead': { min: 8, max: 15 }
    };

    // Determine job experience level from type or title
    let jobLevel = 'mid'; // default
    const title = job.title.toLowerCase();
    const type = job.type.toLowerCase();

    if (type === 'internship' || title.includes('intern')) {
      jobLevel = 'internship';
    } else if (title.includes('junior') || title.includes('entry')) {
      jobLevel = 'entry';
    } else if (title.includes('senior') || title.includes('sr.')) {
      jobLevel = 'senior';
    } else if (title.includes('lead') || title.includes('principal') || title.includes('architect')) {
      jobLevel = 'lead';
    }

    const levelRange = experienceLevels[jobLevel];
    if (userExperience >= levelRange.min && userExperience <= levelRange.max) {
      return 1.0; // Perfect match
    } else if (userExperience < levelRange.min) {
      // User is underqualified
      const gap = levelRange.min - userExperience;
      return Math.max(0, 1 - (gap * 0.2)); // Reduce score by 20% per year gap
    } else {
      // User is overqualified
      const excess = userExperience - levelRange.max;
      return Math.max(0.3, 1 - (excess * 0.1)); // Minimum 30% for overqualified
    }
  }

  /**
   * Calculate location match
   */
  static calculateLocationMatch(userLocation, jobLocation, jobType) {
    // Remote jobs get high score regardless of location
    if (jobType === 'remote' || jobLocation?.toLowerCase().includes('remote')) {
      return 1.0;
    }

    if (!userLocation || !jobLocation) {
      return 0.5; // Neutral score if location info is missing
    }

    const userLoc = userLocation.toLowerCase();
    const jobLoc = jobLocation.toLowerCase();

    // Exact match
    if (userLoc === jobLoc) return 1.0;

    // City/State partial match
    if (userLoc.includes(jobLoc) || jobLoc.includes(userLoc)) {
      return 0.8;
    }

    // Same state (rough heuristic)
    const userParts = userLoc.split(',').map(part => part.trim());
    const jobParts = jobLoc.split(',').map(part => part.trim());

    if (userParts.length > 1 && jobParts.length > 1) {
      if (userParts[userParts.length - 1] === jobParts[jobParts.length - 1]) {
        return 0.6; // Same state
      }
    }

    return 0.2; // Different location
  }

  /**
   * Calculate job recency score
   */
  static calculateRecencyScore(postedAt) {
    if (!postedAt) return 0.5;

    const now = new Date();
    const posted = new Date(postedAt);
    const daysDiff = (now - posted) / (1000 * 60 * 60 * 24);

    if (daysDiff <= 7) return 1.0;      // Posted within a week
    if (daysDiff <= 30) return 0.8;     // Posted within a month
    if (daysDiff <= 60) return 0.6;     // Posted within 2 months
    if (daysDiff <= 90) return 0.4;     // Posted within 3 months
    return 0.2;                         // Older than 3 months
  }

  /**
   * Calculate industry bonus
   */
  static calculateIndustryBonus(company) {
    if (!company?.industry) return 0;

    // Bonus for popular tech industries
    const techIndustries = ['technology', 'software', 'it', 'fintech', 'healthtech'];
    const industry = company.industry.toLowerCase();

    if (techIndustries.some(tech => industry.includes(tech))) {
      return 5; // 5 point bonus for tech companies
    }

    return 2; // Small bonus for having industry info
  }

  /**
   * Get trending jobs (most applied to recently)
   */
  static async getTrendingJobs(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const trendingJobs = await Job.findAll({
        where: { status: 'open' },
        include: [
          {
            model: JobApplication,
            as: 'applications',
            where: {
              applied_at: {
                [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
              }
            },
            required: false
          },
          {
            model: CompanyProfile,
            as: 'company',
            attributes: ['companyName', 'logo', 'industry']
          }
        ],
        order: [
          [{ model: JobApplication, as: 'applications' }, 'applied_at', 'DESC']
        ],
        limit
      });

      res.json({
        success: true,
        trendingJobs: trendingJobs.map(job => ({
          ...job.toJSON(),
          applicationCount: job.applications?.length || 0
        }))
      });

    } catch (error) {
      console.error('Error fetching trending jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trending jobs'
      });
    }
  }

  /**
   * Get similar jobs based on a specific job
   */
  static async getSimilarJobs(req, res) {
    try {
      const { jobId } = req.params;
      const limit = parseInt(req.query.limit) || 5;

      const baseJob = await Job.findByPk(jobId);
      if (!baseJob) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Parse base job skills
      let baseJobSkills = [];
      try {
        baseJobSkills = typeof baseJob.skills === 'string' 
          ? JSON.parse(baseJob.skills) 
          : baseJob.skills || [];
      } catch (error) {
        baseJobSkills = [];
      }

      const similarJobs = await Job.findAll({
        where: {
          id: { [Op.ne]: jobId },
          status: 'open',
          [Op.or]: [
            { title: { [Op.like]: `%${baseJob.title.split(' ')[0]}%` } },
            { category: baseJob.category },
            { type: baseJob.type }
          ]
        },
        include: [{
          model: CompanyProfile,
          as: 'company',
          attributes: ['companyName', 'logo']
        }],
        limit: limit * 2
      });

      // Score similar jobs based on skill similarity
      const scoredSimilarJobs = similarJobs.map(job => {
        let jobSkills = [];
        try {
          jobSkills = typeof job.skills === 'string' 
            ? JSON.parse(job.skills) 
            : job.skills || [];
        } catch (error) {
          jobSkills = [];
        }

        const similarity = this.calculateSkillsMatch(baseJobSkills, jobSkills);
        return {
          ...job.toJSON(),
          similarityScore: similarity
        };
      });

      // Sort by similarity and take top results
      const topSimilarJobs = scoredSimilarJobs
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

      res.json({
        success: true,
        similarJobs: topSimilarJobs
      });

    } catch (error) {
      console.error('Error fetching similar jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch similar jobs'
      });
    }
  }
}

module.exports = RecommendationController;
