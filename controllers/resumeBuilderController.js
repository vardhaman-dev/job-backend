const { User, Job, JobSeekerProfile, CompanyProfile } = require('../models');
const { Op, fn, col, where } = require('sequelize');
const aiService = require('../services/aiService');

class ResumeBuilderController {
  /**
   * Generate ATS-optimized resume content based on job requirements
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async generateATSOptimizedResume(req, res) {
    try {
      const { jobId, templateId = 'modern', sections } = req.body;
      const userId = req.user.id;

      // Get user profile
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

      let targetJob = null;
      if (jobId) {
        targetJob = await Job.findByPk(jobId, {
          include: [{
            model: CompanyProfile,
            as: 'company',
            attributes: ['companyName', 'industry']
          }]
        });
      }

      // Generate optimized resume
      const optimizedResume = await ResumeBuilderController.buildOptimizedResume({
        userProfile,
        targetJob,
        templateId,
        sections
      });

      res.json({
        success: true,
        resume: optimizedResume,
        optimizations: optimizedResume.atsOptimizations,
        score: optimizedResume.atsScore
      });

    } catch (error) {
      console.error('Error generating ATS optimized resume:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate optimized resume',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Analyze resume for ATS compatibility and provide score
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async analyzeResumeATS(req, res) {
    try {
      const { resumeText, jobId } = req.body;

      if (!resumeText) {
        return res.status(400).json({
          success: false,
          message: 'Resume text is required'
        });
      }

      let targetJob = null;
      if (jobId) {
        targetJob = await Job.findByPk(jobId);
      }

      const analysis = await ResumeBuilderController.performATSAnalysis(resumeText, targetJob);

      res.json({
        success: true,
        analysis
      });

    } catch (error) {
      console.error('Error analyzing resume:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze resume',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Optimize bullet point using AI
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async optimizeBulletPoint(req, res) {
    try {
      const { currentBullet, jobTitle, company, jobSkills } = req.body;

      if (!currentBullet) {
        return res.status(400).json({
          success: false,
          message: 'Current bullet point is required'
        });
      }

      const optimizedBullet = await aiService.generateBulletPoint(
        jobTitle || 'Software Developer',
        company || 'Company',
        currentBullet,
        jobSkills || []
      );

      res.json({
        success: true,
        originalBullet: currentBullet,
        optimizedBullet
      });

    } catch (error) {
      console.error('Error optimizing bullet point:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize bullet point',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Optimize summary using AI
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async optimizeSummary(req, res) {
    try {
      console.log('=== OPTIMIZE SUMMARY REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const { currentSummary, jobTitle, skills, experience, jobDetails } = req.body;

      if (!currentSummary || !currentSummary.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Current summary is required and cannot be empty'
        });
      }

      console.log('=== PROCESSING OPTIMIZATION ===');
      console.log('Job Details received:', jobDetails ? 'YES' : 'NO');
      
      let optimizedSummary;
      
      if (jobDetails && jobDetails.title) {
        console.log('Job Title:', jobDetails.title);
        console.log('Company:', jobDetails.company?.companyName || jobDetails.company);
        console.log('Using AI for job-specific optimization');
        
        // Use AI for job-specific optimization
        optimizedSummary = await aiService.optimizeSummaryForJob(
          currentSummary.trim(),
          jobDetails.title,
          skills || [],
          experience || 2,
          jobDetails
        );
        
        console.log('✅ Job-specific optimization completed');
        
        return res.json({
          success: true,
          originalSummary: currentSummary,
          optimizedSummary: optimizedSummary,
          improvementSuggestions: [
            `Tailored for ${jobDetails.title} position`,
            `Optimized for ${jobDetails.company?.companyName || jobDetails.company || 'target company'}`,
            'Enhanced with relevant keywords and skills'
          ]
        });
      } else {
        console.log('Using general AI optimization');
        
        // General optimization
        optimizedSummary = await aiService.optimizeSummaryForJob(
          currentSummary.trim(),
          jobTitle || 'Professional',
          skills || [],
          experience || 2,
          null
        );
        
        console.log('✅ General optimization completed');
      }

      console.log('=== OPTIMIZATION SUCCESSFUL ===');
      console.log('Optimized summary length:', optimizedSummary.length);

      res.json({
        success: true,
        originalSummary: currentSummary,
        optimizedSummary
      });

    } catch (error) {
      console.error('Error optimizing summary:', error);
      res.status(500).json({
        success: false,
        message: 'Summary optimization failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get AI-powered skill suggestions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getSkillSuggestions(req, res) {
    try {
      const { currentSkills, jobTitle, industry } = req.body;

      const suggestedSkills = await aiService.suggestSkills(
        currentSkills || [],
        jobTitle || 'Software Developer',
        industry || 'Technology'
      );

      res.json({
        success: true,
        currentSkills,
        suggestedSkills
      });

    } catch (error) {
      console.error('Error getting skill suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get skill suggestions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate cover letter using AI
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async generateCoverLetter(req, res) {
    try {
      const { resumeData, jobTitle, company, jobDescription } = req.body;
      const userId = req.user.id;

      if (!resumeData || !jobTitle || !company) {
        return res.status(400).json({
          success: false,
          message: 'Resume data, job title, and company are required'
        });
      }

      const coverLetter = await aiService.generateCoverLetter(
        resumeData,
        jobTitle,
        company,
        jobDescription || ''
      );

      res.json({
        success: true,
        coverLetter,
        jobTitle,
        company
      });

    } catch (error) {
      console.error('Error generating cover letter:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate cover letter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get real jobs for optimization target
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAvailableJobs(req, res) {
    try {
      console.log('🔥 getAvailableJobs called with query:', req.query);
      const limit = parseInt(req.query.limit) || 100;

      console.log('🔥 Fetching real jobs from database...');
      const jobs = await Job.findAll({
        where: {
          status: 'open'
        },
        include: [{
          model: CompanyProfile,
          as: 'company',
          attributes: ['companyName', 'industry', 'logo', 'website', 'location'],
          required: false // Allow jobs without company profiles
        }],
        order: [['posted_at', 'DESC']],
        limit: Math.min(limit, 100)
      });

      console.log(`🔥 Found ${jobs.length} real jobs in database`);

      if (jobs.length === 0) {
        console.log('🔥 No jobs found in database!');
        return res.json({
          success: true,
          jobs: [],
          total: 0,
          message: 'No jobs available in database. Please add some jobs first.'
        });
      }

      // Map to proper structure with real company data
      const jobsData = jobs.map(job => {
        // Parse skills and tags if they're JSON strings
        let skills = [];
        let tags = [];
        
        try {
          if (typeof job.skills === 'string') {
            skills = JSON.parse(job.skills);
          } else if (Array.isArray(job.skills)) {
            skills = job.skills;
          }
        } catch (e) {
          skills = [];
        }

        try {
          if (typeof job.tags === 'string') {
            tags = JSON.parse(job.tags);
          } else if (Array.isArray(job.tags)) {
            tags = job.tags;
          }
        } catch (e) {
          tags = [];
        }

        return {
          id: job.id,
          title: job.title,
          company: {
            companyName: job.company?.companyName || 'Company Name Not Available',
            industry: job.company?.industry || 'Technology',
            logo: job.company?.logo || null,
            website: job.company?.website || null,
            location: job.company?.location || job.location
          },
          location: job.location || 'Location Not Specified',
          salary: job.salary_range || 'Salary Not Specified',
          type: job.type || 'full_time',
          description: job.description || 'No description available',
          skills: skills,
          tags: tags,
          category: job.category || 'General',
          requirements: job.description || 'No requirements specified',
          createdAt: job.posted_at,
          deadline: job.deadline
        };
      });

      console.log(`🔥 Successfully mapped ${jobsData.length} jobs with company data`);

      res.json({
        success: true,
        jobs: jobsData,
        total: jobsData.length,
        message: `Found ${jobsData.length} real jobs from database`
      });

    } catch (error) {
      console.error('Error fetching available jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available jobs from database',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Search jobs for optimization targeting
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchJobs(req, res) {
    try {
      const { query, limit = 20 } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const jobs = await Job.findAll({
        where: {
          status: 'open',
          [Op.or]:[
          where(fn('LOWER', col('title')), { [Op.like]: `%${query.toLowerCase()}%` }),
          where(fn('LOWER', col('description')), { [Op.like]: `%${query.toLowerCase()}%` }),
          where(fn('LOWER', col('tags')), { [Op.like]: `%${query.toLowerCase()}%` })
        ]
        },
        include: [{
          model: CompanyProfile,
          as: 'company',
          attributes: ['companyName', 'industry', 'logo']
        }],
        order: [['posted_at', 'DESC']],
        limit: parseInt(limit)
      });

      const jobsData = jobs.map(job => ({
        id: job.id,
        title: job.title,
        company: {
          companyName: job.company?.companyName || 'Company',
          industry: job.company?.industry || 'Technology',
          logo: job.company?.logo
        },
        location: job.location,
        salary: job.salary_range,
        description: job.description.substring(0, 200) + '...',
        createdAt: job.posted_at
      }));

      res.json({
        success: true,
        jobs: jobsData,
        query
      });

    } catch (error) {
      console.error('Error searching jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search jobs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  static async extractJobKeywords(req, res) {
    try {
      const { jobId } = req.params;

      const job = await Job.findByPk(jobId, {
        include: [{
          model: CompanyProfile,
          as: 'company',
          attributes: ['companyName', 'industry']
        }]
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Use AI to extract keywords for better accuracy
      let keywords;
      try {
        // Only use AI if we have good job data
        if (job.description && job.description.length > 50) {
          keywords = await Promise.race([
            aiService.extractJobKeywords(job.title, job.description, job.requirements || ''),
            new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 8000))
          ]);
        } else {
          throw new Error('Insufficient job data for AI analysis');
        }
      } catch (aiError) {
        console.warn('AI keyword extraction failed, using fallback:', aiError.message);
        // Fallback to manual extraction
        keywords = await ResumeBuilderController.extractKeywordsFromJob(job);
      }

      res.json({
        success: true,
        keywords,
        job: {
          id: job.id,
          title: job.title,
          company: job.company?.companyName
        }
      });

    } catch (error) {
      console.error('Error extracting keywords:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to extract keywords'
      });
    }
  }

  /**
   * Generate intelligent content suggestions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async generateContentSuggestions(req, res) {
    try {
      const { jobTitle, experience, skills, industry } = req.body;

      console.log('Generating content suggestions for:', { jobTitle, experience, skills: skills?.length, industry });

      // Use efficient template-based approach with AI enhancement
      const suggestions = await ResumeBuilderController.generateIntelligentContent({
        jobTitle: jobTitle || 'Professional',
        experience: experience || 1,
        skills: skills || [],
        industry: industry || 'Technology'
      });

      console.log('Content suggestions generated successfully');

      res.json({
        success: true,
        suggestions
      });

    } catch (error) {
      console.error('Error generating content suggestions:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Provide reliable fallback response
      const fallbackSuggestions = await ResumeBuilderController.getEnhancedFallbackSuggestions(
        req.body.jobTitle || 'Professional',
        req.body.experience || 1,
        req.body.skills || [],
        req.body.industry || 'Technology'
      );
      
      res.json({
        success: true,
        suggestions: fallbackSuggestions,
        note: 'Generated using enhanced templates'
      });
    }
  }

  /**
   * Generate intelligent content with AI enhancement
   */
  static async generateIntelligentContent({ jobTitle, experience, skills, industry }) {
    try {
      console.log('Generating intelligent content suggestions');

      // Use template-based approach with AI skill suggestions
      const suggestions = {
        bulletPoints: await ResumeBuilderController.generateSmartBulletPoints(jobTitle, experience, skills),
        summaryTemplates: await ResumeBuilderController.generateEnhancedSummaryTemplates(jobTitle, experience, skills, industry),
        skillSuggestions: await ResumeBuilderController.getEnhancedSkillSuggestions(skills || [], jobTitle, industry),
        actionVerbs: ResumeBuilderController.getContextualActionVerbs(industry, jobTitle)
      };

      console.log('Generated comprehensive suggestions');
      return suggestions;

    } catch (error) {
      console.error('Error generating intelligent content, using enhanced fallback:', error);
      return await ResumeBuilderController.getEnhancedFallbackSuggestions(jobTitle, experience, skills, industry);
    }
  }

  /**
   * Generate intelligent bullet points for resume
   */
  static async generateSmartBulletPoints(jobTitle, experience, skills) {
    console.log('Generating intelligent bullet points for:', jobTitle);
    
    // Use reliable intelligent generation for consistent results
    return ResumeBuilderController.getIntelligentBullets(jobTitle, skills, experience);
  }

  /**
   * Intelligent bullet generation with realistic metrics
   */
  static getIntelligentBullets(jobTitle, skills, experience) {
    const skill1 = skills[0] || 'modern technology';
    const skill2 = skills[1] || skills[0] || 'development tools';
    
    // Realistic metrics based on experience level
    const baseMetric = Math.max(15, Math.min(experience * 10, 50));
    const userCount = experience < 2 ? '1,000' : experience < 4 ? '5,000' : '10,000';
    const teamSize = Math.min(experience + 2, 8);
    
    return [
      `Built scalable ${skill1} application serving ${userCount}+ daily active users with 99.9% uptime`,
      `Developed efficient ${skill2} components reducing page load time by ${baseMetric}% and improving user engagement`,
      `Led team of ${teamSize} developers implementing ${skill1} architecture that increased system performance by ${baseMetric + 10}%`,
      `Optimized ${skill1} workflows cutting deployment time from hours to minutes using automated CI/CD pipeline`,
      `Created reusable ${skill2} component library adopted by ${Math.floor(experience/2) + 2} development teams across organization`
    ];
  }

  /**
   * Get role-specific tasks and metrics
   */
  static getRoleSpecificTasks(jobTitle) {
    const jobLower = jobTitle.toLowerCase();
    
    if (jobLower.includes('developer') || jobLower.includes('engineer')) {
      return {
        task1: 'responsive web applications',
        task2: 'RESTful APIs and microservices',
        task3: 'code review processes and development workflows',
        metric: '30% code quality'
      };
    } else if (jobLower.includes('manager') || jobLower.includes('lead')) {
      return {
        task1: 'strategic initiatives and project roadmaps',
        task2: 'team productivity frameworks',
        task3: 'resource allocation and budget planning',
        metric: '40% operational efficiency'
      };
    } else if (jobLower.includes('designer')) {
      return {
        task1: 'user-centered design solutions',
        task2: 'interactive prototypes and wireframes',
        task3: 'design system standards',
        metric: '50% user engagement'
      };
    } else {
      return {
        task1: 'innovative solutions and processes',
        task2: 'efficient workflows and procedures',
        task3: 'quality assurance and optimization strategies',
        metric: '35% productivity'
      };
    }
  }

  /**
   * Generate intelligent summary templates
   */
  static async generateEnhancedSummaryTemplates(jobTitle, experience, skills, industry) {
    console.log('Generating intelligent summary templates for:', jobTitle);
    
    // Use intelligent generation without AI dependency for reliability
    return ResumeBuilderController.getIntelligentSummaries(jobTitle, experience, skills, industry);
  }

  /**
   * Intelligent summary generation
   */
  static getIntelligentSummaries(jobTitle, experience, skills, industry) {
    const primarySkill = skills[0] || 'technology';
    const secondarySkill = skills[1] || 'development';
    
    const experienceText = experience === 1 ? '1 year' : `${experience} years`;
    
    const summaries = [
      `${jobTitle} with ${experienceText} of experience in ${primarySkill} and ${secondarySkill}. Focused on building efficient, scalable solutions that deliver business value.`,
      
      `${experienceText} ${jobTitle} specializing in ${primarySkill} development. Proven ability to deliver high-quality solutions and collaborate effectively with cross-functional teams.`,
      
      `Dedicated ${jobTitle} with expertise in ${primarySkill} and passion for ${secondarySkill}. ${experienceText} of experience creating user-centered applications and driving technical innovation.`
    ];
    
    return summaries;
  }

  /**
   * Get industry-specific adjective
   */
  static getIndustryAdjective(industry) {
    const industryMap = {
      'technology': 'scalable technology',
      'finance': 'secure financial',
      'healthcare': 'compliant healthcare',
      'education': 'innovative educational',
      'retail': 'customer-focused retail',
      'marketing': 'data-driven marketing'
    };
    return industryMap[industry?.toLowerCase()] || 'innovative business';
  }

  /**
   * Get enhanced skill suggestions with AI fallback
   */
  static async getEnhancedSkillSuggestions(currentSkills, jobTitle, industry) {
    const aiService = require('../services/aiService');
    
    try {
      // Try AI first but with timeout
      const aiSkills = await Promise.race([
        aiService.suggestSkills(currentSkills, jobTitle, industry),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 3000))
      ]);
      return aiSkills;
    } catch (error) {
      console.log('AI skill suggestions failed, using enhanced fallback');
      return ResumeBuilderController.getAdvancedSkillSuggestions(jobTitle, industry, currentSkills);
    }
  }

  /**
   * Advanced skill suggestions with better intelligence
   */
  static getAdvancedSkillSuggestions(jobTitle, industry, currentSkills) {
    const skillDatabase = {
      'frontend': ['React', 'Vue.js', 'TypeScript', 'Webpack', 'Jest', 'Sass'],
      'backend': ['Node.js', 'Python', 'Docker', 'PostgreSQL', 'Redis', 'GraphQL'],
      'fullstack': ['JavaScript', 'React', 'Node.js', 'MongoDB', 'AWS', 'Git'],
      'mobile': ['React Native', 'Flutter', 'Swift', 'Firebase', 'API Integration'],
      'data': ['Python', 'SQL', 'Pandas', 'Machine Learning', 'Tableau', 'Statistics'],
      'devops': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'Monitoring'],
      'manager': ['Leadership', 'Agile', 'Strategic Planning', 'Budget Management', 'Team Building'],
      'designer': ['Figma', 'Adobe Creative Suite', 'Prototyping', 'User Research', 'Design Systems']
    };
    
    const jobLower = jobTitle.toLowerCase();
    const currentSkillsLower = currentSkills.map(s => s.toLowerCase());
    
    // Smart skill matching
    let relevantSkills = [];
    const skillKeys = Object.keys(skillDatabase);
    
    for (const key of skillKeys) {
      if (jobLower.includes(key)) {
        relevantSkills = skillDatabase[key];
        break;
      }
    }
    
    // Default to general skills if no match
    if (relevantSkills.length === 0) {
      relevantSkills = ['Git', 'Agile', 'Problem Solving', 'Communication', 'Testing'];
    }
    
    // Filter out existing skills and return top 5
    return relevantSkills
      .filter(skill => !currentSkillsLower.includes(skill.toLowerCase()))
      .slice(0, 5);
  }

  /**
   * Get contextual action verbs based on industry and role
   */
  static getContextualActionVerbs(industry, jobTitle) {
    const baseVerbs = ['Achieved', 'Managed', 'Led', 'Improved', 'Created', 'Delivered'];
    
    const industryVerbs = {
      'technology': ['Developed', 'Engineered', 'Architected', 'Optimized', 'Automated', 'Integrated'],
      'marketing': ['Strategized', 'Launched', 'Increased', 'Generated', 'Analyzed', 'Campaigned'],
      'finance': ['Analyzed', 'Forecasted', 'Managed', 'Optimized', 'Calculated', 'Audited'],
      'healthcare': ['Treated', 'Diagnosed', 'Implemented', 'Coordinated', 'Improved', 'Managed']
    };
    
    const jobVerbs = {
      'manager': ['Led', 'Directed', 'Coordinated', 'Supervised', 'Organized', 'Facilitated'],
      'developer': ['Developed', 'Coded', 'Built', 'Programmed', 'Debugged', 'Deployed'],
      'designer': ['Designed', 'Created', 'Crafted', 'Conceptualized', 'Prototyped', 'Visualized']
    };
    
    // Combine verbs based on context
    let contextualVerbs = [...baseVerbs];
    
    if (industry && industryVerbs[industry.toLowerCase()]) {
      contextualVerbs = [...contextualVerbs, ...industryVerbs[industry.toLowerCase()]];
    }
    
    const jobKey = Object.keys(jobVerbs).find(key => 
      jobTitle.toLowerCase().includes(key)
    );
    if (jobKey) {
      contextualVerbs = [...contextualVerbs, ...jobVerbs[jobKey]];
    }
    
    // Remove duplicates and return
    return [...new Set(contextualVerbs)];
  }

  /**
   * Enhanced fallback suggestions with better quality
   */
  static async getEnhancedFallbackSuggestions(jobTitle, experience, skills, industry) {
    return {
      bulletPoints: await ResumeBuilderController.generateSmartBulletPoints(jobTitle, experience, skills),
      summaryTemplates: await ResumeBuilderController.generateEnhancedSummaryTemplates(jobTitle, experience, skills, industry),
      skillSuggestions: ResumeBuilderController.getAdvancedSkillSuggestions(jobTitle, industry, skills),
      actionVerbs: ResumeBuilderController.getContextualActionVerbs(industry, jobTitle)
    };
  }

  /**
   * Get available resume templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getResumeTemplates(req, res) {
    try {
      const templates = ResumeBuilderController.getAvailableTemplates();

      res.json({
        success: true,
        templates
      });

    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch templates'
      });
    }
  }

  /**
   * Build optimized resume based on user data and target job
   */
  static async buildOptimizedResume({ userProfile, targetJob, templateId, sections }) {
    const user = userProfile.user;
    
    // Parse user skills
    let userSkills = [];
    try {
      userSkills = userProfile.skillsJson || [];
      if (typeof userSkills === 'string') {
        userSkills = JSON.parse(userSkills);
      }
    } catch (error) {
      userSkills = [];
    }

    // Extract job keywords if target job provided
    let jobKeywords = [];
    let jobSkills = [];
    if (targetJob) {
      jobKeywords = await ResumeBuilderController.extractKeywordsFromJob(targetJob);
      try {
        jobSkills = typeof targetJob.skills === 'string' 
          ? JSON.parse(targetJob.skills) 
          : targetJob.skills || [];
      } catch (error) {
        jobSkills = [];
      }
    }

    // Generate optimized content
    const optimizedSummary = ResumeBuilderController.generateOptimizedSummary({
      userProfile,
      targetJob,
      jobKeywords
    });

    const optimizedSkills = ResumeBuilderController.optimizeSkillsSection({
      userSkills,
      jobSkills,
      jobKeywords
    });

    const optimizedExperience = await ResumeBuilderController.optimizeExperienceSection({
      userProfile,
      targetJob,
      jobKeywords
    });

    // Calculate ATS score
    const atsScore = ResumeBuilderController.calculateATSScore({
      userSkills: optimizedSkills,
      jobSkills,
      jobKeywords,
      summary: optimizedSummary,
      hasEducation: sections?.education?.length > 0,
      hasExperience: sections?.experience?.length > 0
    });

    const resume = {
      personalInfo: {
        name: user.name,
        email: user.email,
        phone: userProfile.phoneNumber || '',
        address: userProfile.address || '',
        summary: optimizedSummary
      },
      skills: optimizedSkills,
      experience: optimizedExperience,
      education: sections?.education || [],
      template: templateId,
      atsScore: atsScore.total,
      atsOptimizations: atsScore.optimizations,
      targetJob: targetJob ? {
        id: targetJob.id,
        title: targetJob.title,
        company: targetJob.company?.companyName
      } : null
    };

    return resume;
  }

  /**
   * Perform comprehensive ATS analysis
   */
  static async performATSAnalysis(resumeText, targetJob = null) {
    const analysis = {
      overallScore: 0,
      sections: {},
      recommendations: [],
      keywords: {
        found: [],
        missing: [],
        score: 0
      },
      formatting: {
        score: 0,
        issues: []
      }
    };

    // Analyze basic formatting
    analysis.formatting = this.analyzeFormatting(resumeText);
    
    // Analyze keywords if target job provided
    if (targetJob) {
      const jobKeywords = await ResumeBuilderController.extractKeywordsFromJob(targetJob);
      analysis.keywords = this.analyzeKeywords(resumeText, jobKeywords);
    }

    // Analyze sections
    analysis.sections = this.analyzeSections(resumeText);

    // Calculate overall score
    analysis.overallScore = this.calculateOverallATSScore(analysis);

    // Generate recommendations
    analysis.recommendations = this.generateATSRecommendations(analysis);

    return analysis;
  }

  /**
   * Extract keywords from job posting using NLP techniques
   */
  static async extractKeywordsFromJob(job) {
    console.log('Using manual keyword extraction fallback');
    
    const text = `${job.title} ${job.description} ${job.requirements || ''}`.toLowerCase();
    
    // Parse job skills
    let jobSkills = [];
    try {
      jobSkills = typeof job.skills === 'string' 
        ? JSON.parse(job.skills) 
        : job.skills || [];
    } catch (error) {
      jobSkills = [];
    }

    // Enhanced technical skills database
    const technicalSkills = [
      'javascript', 'python', 'java', 'react', 'vue', 'angular', 'node.js', 'nodejs',
      'express', 'mongodb', 'mysql', 'postgresql', 'aws', 'docker', 'kubernetes',
      'git', 'rest api', 'graphql', 'typescript', 'html', 'css', 'sass', 'redux',
      'next.js', 'nextjs', 'nuxt.js', 'php', 'laravel', 'django', 'flask', 'spring boot',
      'c++', 'c#', '.net', 'azure', 'gcp', 'devops', 'ci/cd', 'jenkins',
      'terraform', 'ansible', 'linux', 'bash', 'powershell', 'agile', 'scrum',
      'sql', 'nosql', 'redis', 'elasticsearch', 'kafka', 'microservices', 'api',
      'machine learning', 'ai', 'data science', 'pandas', 'numpy', 'tensorflow'
    ];

    // Soft skills database
    const softSkills = [
      'communication', 'leadership', 'teamwork', 'problem solving', 'time management',
      'project management', 'critical thinking', 'adaptability', 'creativity',
      'attention to detail', 'organization', 'collaboration', 'analytical skills',
      'strategic thinking', 'innovation', 'mentoring', 'coaching', 'presentation'
    ];

    // Action verbs
    const actionVerbs = [
      'Developed', 'Implemented', 'Designed', 'Created', 'Built', 'Managed', 'Led',
      'Optimized', 'Improved', 'Increased', 'Reduced', 'Streamlined', 'Coordinated',
      'Collaborated', 'Analyzed', 'Researched', 'Delivered', 'Achieved', 'Executed'
    ];

    const keywords = {
      technical: [],
      soft: [],
      action: [],
      industry: [],
      requirements: []
    };

    // Extract technical skills
    technicalSkills.forEach(skill => {
      if (text.toLowerCase().includes(skill.toLowerCase()) || 
          jobSkills.some(jobSkill => jobSkill.toLowerCase().includes(skill.toLowerCase()))) {
        keywords.technical.push(skill);
      }
    });

    // Extract soft skills
    softSkills.forEach(skill => {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        keywords.soft.push(skill);
      }
    });

    // Extract action verbs
    actionVerbs.forEach(verb => {
      if (text.toLowerCase().includes(verb.toLowerCase())) {
        keywords.action.push(verb);
      }
    });

    // Extract requirements (common requirement phrases)
    const requirementPatterns = [
      /(\d+\+?\s*years?\s*of?\s*experience)/gi,
      /(bachelor'?s?\s*degree)/gi,
      /(master'?s?\s*degree)/gi,
      /(certification)/gi,
      /(experience\s*with)/gi,
      /(knowledge\s*of)/gi,
      /(proficiency\s*in)/gi
    ];

    requirementPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        keywords.requirements.push(...matches);
      }
    });

    // Add job skills directly
    keywords.technical.push(...jobSkills);

    // Remove duplicates and return
    Object.keys(keywords).forEach(key => {
      keywords[key] = [...new Set(keywords[key])];
    });

    return keywords;
  }

  /**
   * Generate optimized summary section
   */
  static generateOptimizedSummary({ userProfile, targetJob, jobKeywords }) {
    const baseSkills = userProfile.skillsJson || [];
    const experience = userProfile.experienceYears || 0;
    
    // Get top skills that match job requirements
    const relevantSkills = jobKeywords.technical?.slice(0, 5) || baseSkills.slice(0, 5);
    
    let summary = `Experienced professional with ${experience}+ years of expertise in `;
    
    if (relevantSkills.length > 0) {
      summary += relevantSkills.slice(0, 3).join(', ');
      if (relevantSkills.length > 3) {
        summary += `, and ${relevantSkills.slice(3).join(', ')}`;
      }
    } else {
      summary += 'software development and technology solutions';
    }
    
    summary += '. ';
    
    if (targetJob) {
      summary += `Seeking to leverage proven skills in ${targetJob.title} role `;
      if (targetJob.company?.companyName) {
        summary += `at ${targetJob.company.companyName} `;
      }
      summary += 'to drive innovation and deliver exceptional results.';
    } else {
      summary += 'Passionate about delivering high-quality solutions and driving business growth through technology.';
    }

    return summary;
  }

  /**
   * Optimize skills section for ATS
   */
  static optimizeSkillsSection({ userSkills, jobSkills, jobKeywords }) {
    const allJobSkills = [
      ...(jobSkills || []),
      ...(jobKeywords.technical || [])
    ];

    // Prioritize skills that match job requirements
    const matchedSkills = userSkills.filter(skill => 
      allJobSkills.some(jobSkill => 
        skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    const otherSkills = userSkills.filter(skill => !matchedSkills.includes(skill));

    // Add high-priority job skills that user might have but didn't list
    const suggestedSkills = allJobSkills.filter(jobSkill => 
      !userSkills.some(userSkill => 
        userSkill.toLowerCase().includes(jobSkill.toLowerCase())
      )
    ).slice(0, 3);

    return [
      ...matchedSkills,
      ...otherSkills,
      ...suggestedSkills
    ].slice(0, 15); // Limit to 15 skills max
  }

  /**
   * Optimize experience section
   */
  static async optimizeExperienceSection({ userProfile, targetJob, jobKeywords }) {
    // This would typically pull from user's experience data
    // For now, return optimized template structure
    const actionVerbs = jobKeywords.action || [
      'Developed', 'Implemented', 'Designed', 'Led', 'Managed', 'Optimized'
    ];

    const relevantSkills = jobKeywords.technical?.slice(0, 8) || [];

    return [
      {
        title: 'Software Developer',
        company: 'Previous Company',
        duration: '2022 - Present',
        bullets: [
          `${actionVerbs[0]} scalable web applications using ${relevantSkills.slice(0, 3).join(', ')}`,
          `${actionVerbs[1]} responsive user interfaces that improved user engagement by 25%`,
          `${actionVerbs[2]} and maintained RESTful APIs serving 10,000+ daily users`,
          `${actionVerbs[3]} cross-functional team of 5 developers in agile environment`
        ]
      }
    ];
  }

  /**
   * Calculate ATS score
   */
  static calculateATSScore({ userSkills, jobSkills, jobKeywords, summary, hasEducation, hasExperience }) {
    let score = 0;
    const optimizations = [];

    // Skills matching (40%)
    const skillsMatch = this.calculateSkillsMatchScore(userSkills, jobSkills, jobKeywords);
    score += skillsMatch.score * 40;
    optimizations.push(...skillsMatch.optimizations);

    // Resume completeness (25%)
    const completeness = this.calculateCompletenessScore(hasEducation, hasExperience, summary);
    score += completeness.score * 25;
    optimizations.push(...completeness.optimizations);

    // Keyword density (20%)
    const keywordScore = this.calculateKeywordScore(summary, jobKeywords);
    score += keywordScore.score * 20;
    optimizations.push(...keywordScore.optimizations);

    // Format optimization (15%)
    const formatScore = 0.8; // Assume good format from our builder
    score += formatScore * 15;

    return {
      total: Math.round(score),
      optimizations: optimizations.slice(0, 5) // Top 5 optimizations
    };
  }

  /**
   * Calculate skills match score
   */
  static calculateSkillsMatchScore(userSkills, jobSkills, jobKeywords) {
    const allRequiredSkills = [
      ...(jobSkills || []),
      ...(jobKeywords.technical || [])
    ];

    if (allRequiredSkills.length === 0) {
      return { score: 0.8, optimizations: [] };
    }

    const matchedCount = allRequiredSkills.filter(reqSkill =>
      userSkills.some(userSkill =>
        userSkill.toLowerCase().includes(reqSkill.toLowerCase()) ||
        reqSkill.toLowerCase().includes(userSkill.toLowerCase())
      )
    ).length;

    const score = matchedCount / allRequiredSkills.length;
    const optimizations = [];

    if (score < 0.6) {
      const missingSkills = allRequiredSkills.filter(reqSkill =>
        !userSkills.some(userSkill =>
          userSkill.toLowerCase().includes(reqSkill.toLowerCase())
        )
      ).slice(0, 3);

      optimizations.push({
        type: 'skills',
        priority: 'high',
        message: `Add these key skills: ${missingSkills.join(', ')}`,
        impact: 'High impact on ATS ranking'
      });
    }

    return { score, optimizations };
  }

  /**
   * Calculate completeness score
   */
  static calculateCompletenessScore(hasEducation, hasExperience, summary) {
    let score = 0;
    const optimizations = [];

    if (hasExperience) score += 0.4;
    else optimizations.push({
      type: 'experience',
      priority: 'high',
      message: 'Add work experience section',
      impact: 'Critical for ATS parsing'
    });

    if (hasEducation) score += 0.3;
    else optimizations.push({
      type: 'education',
      priority: 'medium',
      message: 'Add education section',
      impact: 'Improves ATS compatibility'
    });

    if (summary && summary.length > 50) score += 0.3;
    else optimizations.push({
      type: 'summary',
      priority: 'medium',
      message: 'Add professional summary (50+ words)',
      impact: 'Helps ATS understand your profile'
    });

    return { score, optimizations };
  }

  /**
   * Calculate keyword score
   */
  static calculateKeywordScore(summary, jobKeywords) {
    if (!summary || !jobKeywords.technical) {
      return { score: 0.5, optimizations: [] };
    }

    const summaryLower = summary.toLowerCase();
    const keywordCount = jobKeywords.technical.filter(keyword =>
      summaryLower.includes(keyword.toLowerCase())
    ).length;

    const score = Math.min(keywordCount / 5, 1); // Max score if 5+ keywords
    const optimizations = [];

    if (score < 0.6) {
      optimizations.push({
        type: 'keywords',
        priority: 'medium',
        message: 'Include more job-relevant keywords in summary',
        impact: 'Improves keyword matching score'
      });
    }

    return { score, optimizations };
  }

  /**
   * Analyze formatting for ATS compatibility
   */
  static analyzeFormatting(resumeText) {
    const issues = [];
    let score = 100;

    // Check for common ATS issues
    if (resumeText.includes('\t')) {
      issues.push('Avoid using tabs - use spaces instead');
      score -= 10;
    }

    if (resumeText.split('\n').some(line => line.length > 100)) {
      issues.push('Some lines are too long - keep under 100 characters');
      score -= 5;
    }

    return {
      score: Math.max(score, 0),
      issues
    };
  }

  /**
   * Analyze keywords in resume
   */
  static analyzeKeywords(resumeText, jobKeywords) {
    const resumeLower = resumeText.toLowerCase();
    const allKeywords = [
      ...(jobKeywords.technical || []),
      ...(jobKeywords.soft || [])
    ];

    const found = allKeywords.filter(keyword =>
      resumeLower.includes(keyword.toLowerCase())
    );

    const missing = allKeywords.filter(keyword => !found.includes(keyword));

    return {
      found,
      missing: missing.slice(0, 10), // Top 10 missing keywords
      score: Math.round((found.length / allKeywords.length) * 100)
    };
  }

  /**
   * Analyze resume sections
   */
  static analyzeSections(resumeText) {
    const sections = {
      contact: resumeText.toLowerCase().includes('@') && resumeText.includes('phone'),
      summary: resumeText.toLowerCase().includes('summary') || resumeText.toLowerCase().includes('objective'),
      experience: resumeText.toLowerCase().includes('experience') || resumeText.toLowerCase().includes('work'),
      education: resumeText.toLowerCase().includes('education') || resumeText.toLowerCase().includes('degree'),
      skills: resumeText.toLowerCase().includes('skills') || resumeText.toLowerCase().includes('technical')
    };

    return sections;
  }

  /**
   * Calculate overall ATS score
   */
  static calculateOverallATSScore(analysis) {
    const weights = {
      formatting: 0.2,
      keywords: 0.4,
      sections: 0.4
    };

    const sectionScore = Object.values(analysis.sections).filter(Boolean).length * 20;
    
    return Math.round(
      analysis.formatting.score * weights.formatting +
      analysis.keywords.score * weights.keywords +
      sectionScore * weights.sections
    );
  }

  /**
   * Generate ATS recommendations
   */
  static generateATSRecommendations(analysis) {
    const recommendations = [];

    if (analysis.overallScore < 70) {
      recommendations.push({
        type: 'critical',
        message: 'Resume needs significant optimization for ATS compatibility',
        action: 'Focus on keyword optimization and formatting'
      });
    }

    if (analysis.keywords.score < 60) {
      recommendations.push({
        type: 'high',
        message: `Add missing keywords: ${analysis.keywords.missing.slice(0, 5).join(', ')}`,
        action: 'Include relevant keywords naturally in your content'
      });
    }

    if (!analysis.sections.summary) {
      recommendations.push({
        type: 'medium',
        message: 'Add a professional summary section',
        action: 'Include 2-3 sentences highlighting your key qualifications'
      });
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Generate smart content suggestions
   */
  /**
   * Generate intelligent content suggestions using AI (token-optimized)
   */
  static async generateSmartContent({ jobTitle, experience, skills, industry }) {
    // This method is replaced by generateIntelligentContent
    return this.generateIntelligentContent({ jobTitle, experience, skills, industry });
  }

  /**
   * Get available resume templates
   */
  static getAvailableTemplates() {
    return [
      {
        id: 'modern',
        name: 'Modern Professional',
        description: 'Clean, modern design perfect for tech roles',
        preview: '/templates/modern-preview.jpg',
        atsScore: 95,
        features: ['ATS Optimized', 'Clean Layout', 'Tech-Friendly']
      },
      {
        id: 'executive',
        name: 'Executive',
        description: 'Sophisticated design for senior positions',
        preview: '/templates/executive-preview.jpg',
        atsScore: 90,
        features: ['Leadership Focus', 'Professional', 'Results-Oriented']
      },
      {
        id: 'creative',
        name: 'Creative Professional',
        description: 'Stylish design for creative industries',
        preview: '/templates/creative-preview.jpg',
        atsScore: 85,
        features: ['Visual Appeal', 'Creative Layout', 'Portfolio Ready']
      },
      {
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Simple, clean design that works everywhere',
        preview: '/templates/minimalist-preview.jpg',
        atsScore: 98,
        features: ['Maximum ATS Score', 'Simple Layout', 'Universal Appeal']
      },
      {
        id: 'technical',
        name: 'Technical Specialist',
        description: 'Optimized for technical and engineering roles',
        preview: '/templates/technical-preview.jpg',
        atsScore: 96,
        features: ['Skills Focused', 'Project Highlights', 'Technical Optimized']
      }
    ];
  }

  /**
   * Get available resume templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getTemplates(req, res) {
    try {
      const templates = [
        {
          id: 'minimalist',
          name: 'Minimalist',
          description: 'Clean design with maximum ATS compatibility',
          atsScore: 98,
          features: ['Maximum ATS Score', 'Clean Layout', 'Universal Appeal']
        },
        {
          id: 'technical',
          name: 'Technical Specialist',
          description: 'Perfect for technical and engineering roles',
          atsScore: 96,
          features: ['Skills Focused', 'Project Highlights', 'Technical Optimized']
        },
        {
          id: 'modern',
          name: 'Modern Professional',
          description: 'Contemporary design for modern professionals',
          atsScore: 95,
          features: ['ATS Optimized', 'Clean Layout', 'Professional']
        },
        {
          id: 'executive',
          name: 'Executive',
          description: 'Sophisticated design for leadership roles',
          atsScore: 90,
          features: ['Leadership Focus', 'Results-Oriented', 'Executive Style']
        },
        {
          id: 'creative',
          name: 'Creative Professional',
          description: 'Stylish design for creative industries',
          atsScore: 85,
          features: ['Visual Appeal', 'Creative Layout', 'Portfolio Ready']
        }
      ];

      res.json({
        success: true,
        templates
      });

    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch templates',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ResumeBuilderController;
