const { JobApplication, Job, User, JobSeekerProfile,UserEducation,UserExperience } = require('../models');
// For Node.js versions 18+, fetch is built-in. For older versions, use node-fetch
const fetch = globalThis.fetch || require("node-fetch");
const { createClient } = require('@supabase/supabase-js');
const { sanitizeName, extractTextFromFile } = require("../utils/fileUtils");

const path = require('path');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BUCKET_RESUMES = "resumes";
const BUCKET_COVERLETTERS = 'coverletter';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// File validation constants
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Helper function to validate file
function validateFile(file, type) {
  if (!file) return { valid: true };
  
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return { 
      valid: false, 
      message: `Invalid ${type} file type. Only PDF, DOC, DOCX, and TXT files are allowed.` 
    };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      message: `${type} file is too large. Maximum size is 5MB.` 
    };
  }
  
  return { valid: true };
}

// Helper function to cleanup uploaded files
async function cleanupFile(bucket, path) {
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch (error) {
    console.error(`Failed to cleanup file ${path}:`, error.message);
  }
}

async function scoreResume(resume, job) {
  // Check if API key is available
  if (!OPENROUTER_API_KEY) {
    console.warn("OPENROUTER_API_KEY not found, skipping AI scoring");
    return { score: null, feedback: "AI scoring not configured" };
  }

  const prompt = `You are an ATS AI system. Evaluate the candidate's resume against the job requirements. 
Score strictly from 0–100. 

Use the following weighted criteria:
- Skills match (40%)
- Experience vs. minimum required (25%)
- Education match (15%)
- Job category & role relevance (10%)
- Other details like projects, certifications, achievements (10%)

### Job Details:
Title: ${job.title}
Description: ${job.description}
Location: ${job.location || "Not specified"}
Type: ${job.type}
Salary Range: ${job.salary_range || "Not specified"}
Education Requirement: ${job.education || "Not specified"}
Minimum Experience: ${job.experience_min || 0} years
Skills Required: ${Array.isArray(job.skills) ? job.skills.join(", ") : (job.skills || "Not specified")}
Tags: ${Array.isArray(job.tags) ? job.tags.join(", ") : (job.tags || "Not specified")}
Category: ${job.category || "Not specified"}

### Candidate Resume:
${resume}

Return JSON only in the following format:
{
  "score": <number 0-100>,
  "feedback": "<short bullet points about strengths/weaknesses>"
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    // Try parsing JSON
    let parsed = {};
    try {
      // Clean the text first - remove extra whitespace and newlines
      let cleanText = text.trim();
      console.log("message:",cleanText);
      
      // If the response is wrapped in markdown code blocks, extract it
      const codeBlockMatch = cleanText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        cleanText = codeBlockMatch[1];
      }
      
      // Extract JSON from the response if it's wrapped in other text
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : cleanText;
      
      console.log('Attempting to parse JSON:', jsonText);
      parsed = JSON.parse(jsonText);
      
    } catch (e) {
      console.warn("AI did not return valid JSON, attempting manual extraction:", e.message);
      console.log("Original response text:", text);
      
      // Try to extract score and feedback manually
      const scoreMatch = text.match(/(?:"score":\s*|score":\s*)(\d{1,3})/i);
      const feedbackMatch = text.match(/(?:"feedback":\s*"|feedback":\s*")([^"]*(?:\\.[^"]*)*)/i);
      
      if (scoreMatch) {
        parsed.score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
      } else {
        // Fallback to any number in the text
        const anyNumberMatch = text.match(/\b(\d{1,3})\b/);
        parsed.score = anyNumberMatch ? Math.min(100, Math.max(0, parseInt(anyNumberMatch[1]))) : null;
      }
      
      if (feedbackMatch) {
        // Unescape the feedback string
        parsed.feedback = feedbackMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      } else {
        parsed.feedback = text;
      }
    }

    // Validate and ensure score is a number
    if (parsed.score !== null && typeof parsed.score === 'number') {
      parsed.score = Math.min(100, Math.max(0, Math.round(parsed.score)));
    } else if (parsed.score !== null) {
      // Try to convert string to number
      const scoreNum = parseInt(parsed.score);
      parsed.score = isNaN(scoreNum) ? null : Math.min(100, Math.max(0, scoreNum));
    }
    
    console.log('Parsed result:', { score: parsed.score, feedbackLength: parsed.feedback?.length });

    return parsed;
  } catch (err) {
    console.error("Error scoring resume:", err.message);
    return { score: null, feedback: "Scoring failed due to technical error" };
  }
}

// Apply to a job
exports.applyToJob = async (req, res) => {
  let transaction;
  let resumePath = null;
  let coverPath = null;

  try {
    // Start transaction
    transaction = await JobApplication.sequelize.transaction();

    const { job_id } = req.body;
    const job_seeker_id = req.user.id;

    // Validate job_id format
    if (!job_id || isNaN(parseInt(job_id))) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid job ID format' 
      });
    }

    const resumeFile = req.files?.resume?.[0];
    const coverLetterFile = req.files?.coverLetter?.[0];

    // Validate files
    const resumeValidation = validateFile(resumeFile, 'Resume');
    const coverValidation = validateFile(coverLetterFile, 'Cover Letter');

    if (!resumeValidation.valid) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: resumeValidation.message 
      });
    }

    if (!coverValidation.valid) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: coverValidation.message 
      });
    }

    // Check if at least one file is provided
    if (!resumeFile && !coverLetterFile) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'At least one file (resume or cover letter) is required' 
      });
    }

    // Check job exists
    const job = await Job.findByPk(job_id);
    if (!job) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Prevent duplicate application
    const existing = await JobApplication.findOne({ 
      where: { job_id: parseInt(job_id), job_seeker_id },
      transaction 
    });
    
    if (existing) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Already applied to this job' 
      });
    }

    // Upload files in parallel
    const uploadPromises = [];
    let resume_link = null;
    let cover_letter_link = null;

    // Upload resume if present
    if (resumeFile) {
      resumePath = `user_${job_seeker_id}_job_${job_id}/${Date.now()}_${sanitizeName(resumeFile.originalname)}`;
      uploadPromises.push(
        supabase.storage
          .from(BUCKET_RESUMES)
          .upload(resumePath, resumeFile.buffer, {
            contentType: resumeFile.mimetype,
            upsert: true
          })
          .then(({ error }) => {
            if (error) throw new Error(`Resume upload failed: ${error.message}`);
            const { data } = supabase.storage.from(BUCKET_RESUMES).getPublicUrl(resumePath);
            resume_link = data.publicUrl;
          })
      );
    }

    // Upload cover letter if present
    if (coverLetterFile) {
      coverPath = `user_${job_seeker_id}_job_${job_id}/${Date.now()}_${sanitizeName(coverLetterFile.originalname)}`;
      uploadPromises.push(
        supabase.storage
          .from(BUCKET_COVERLETTERS)
          .upload(coverPath, coverLetterFile.buffer, {
            contentType: coverLetterFile.mimetype,
            upsert: true
          })
          .then(({ error }) => {
            if (error) throw new Error(`Cover letter upload failed: ${error.message}`);
            const { data } = supabase.storage.from(BUCKET_COVERLETTERS).getPublicUrl(coverPath);
            cover_letter_link = data.publicUrl;
          })
      );
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Extract text & run ATS scoring
    let score = null;
    let feedback = null;

    try {
      let combinedText = '';
      if (resumeFile) {
        combinedText += await extractTextFromFile(resumeFile);
      }
      if (coverLetterFile) {
        combinedText += `\n\nCover Letter:\n${await extractTextFromFile(coverLetterFile)}`;
      }
      
      if (combinedText.trim()) {
        console.log('Starting ATS scoring...');
        const result = await scoreResume(combinedText, job);
        console.log('ATS scoring result:', result);
        
        score = result.score;
        feedback = result.feedback;
        
        // Ensure score is properly set
        if (score !== null && !isNaN(score)) {
          console.log('Score successfully extracted:', score);
        } else {
          console.warn('Score extraction failed, result:', result);
        }
      }
    } catch (scoringError) {
      console.error('ATS scoring failed:', scoringError.message);
      // Continue without score - don't fail the entire application
      feedback = "ATS scoring temporarily unavailable";
    }

    // Save application record
    const application = await JobApplication.create({
      job_id: parseInt(job_id),
      job_seeker_id,
      cover_letter: cover_letter_link,
      resume_link,
      ats_score: score,          // ✅ mapped correctly
  ats_feedback: feedback,    
      status: 'applied',
      applied_at: new Date()
    }, { transaction });

    await transaction.commit();

    res.status(201).json({ 
      success: true, 
      application: {
        id: application.id,
        job_id: application.job_id,
        status: application.status,
        ats_score: application.ats_score,
    ats_feedback: application.ats_feedback,
        applied_at: application.applied_at,
        resume_link: application.resume_link,
        cover_letter: application.cover_letter
      },
      feedback 
    });

  } catch (err) {
    console.error('Apply controller error:', err);
    
    // Rollback transaction if it exists
    if (transaction) {
      await transaction.rollback();
    }

    // Cleanup uploaded files on error
    if (resumePath) {
      await cleanupFile(BUCKET_RESUMES, resumePath);
    }
    if (coverPath) {
      await cleanupFile(BUCKET_COVERLETTERS, coverPath);
    }

    res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to apply to job' 
    });
  }
};

// Get all applications for the logged-in job seeker
exports.getMyApplications = async (req, res) => {
  try {
    const job_seeker_id = req.user.id;
    const applications = await JobApplication.findAll({
      where: { job_seeker_id },
      include: [{ model: Job, as: 'job' }]
    });
    res.json({ success: true, applications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
};

// Get candidates for a company
exports.getCompanyCandidates = async (req, res) => {
  try {
    const company_id = parseInt(req.params.companyId);

    if (isNaN(company_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID format'
      });
    }

 const applications = await JobApplication.findAll({
  where: {},
  include: [
    {
      model: Job,
      as: 'job',
      where: { company_id },
      attributes: ['id', 'title', 'location', 'type', 'company_id']
    },
    {
      model: User,
      as: 'jobSeeker',
      attributes: ['id', 'name', 'email'],
      include: [
        {
          model: JobSeekerProfile,
          as: 'jobSeekerProfile',
          attributes: ['skills_json', 'phone_number'],
          required: false,
          include: [
            {
              model: UserExperience,
              as: 'experience', // alias defined in JobSeekerProfile model
              attributes: ['id', 'title', 'company', 'start_date', 'end_date', 'description'],
              required: false
            },
            {
              model: UserEducation,
              as: 'education', // alias defined in JobSeekerProfile model
              attributes: ['id', 'school', 'degree', 'field', 'start_date', 'end_date'],
              required: false
            }
          ]
        }
      ]
    }
  ],
  attributes: ['id', 'job_id', 'job_seeker_id', 'cover_letter', 'resume_link', 'ats_score', 'status', 'applied_at', 'ats_feedback'],
  order: [['applied_at', 'DESC']]
});


    res.json({ 
      success: true, 
      applications,
      total: applications.length 
    });
  } catch (err) {
    console.error('Error fetching company candidates:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch company candidates' 
    });
  }
};

// Update application status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const id = parseInt(req.params.applicationId, 10);

    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid application ID' 
      });
    }

    const validStatuses = ['applied', 'under_review', 'approved', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const application = await JobApplication.findByPk(id, {
      include: [
        { model: Job, as: 'job' },
        { model: User, as: 'jobSeeker' }
      ]
    });

    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }

    // Update status
    application.status = status;
    await application.save();

    // Create notification for the candidate (if notification service exists)
    try {
      const { createNotification } = require('../utils/notificationService');
      
      let notificationMessage = '';
      switch (status) {
        case 'under_review':
          notificationMessage = `Your application for ${application.job.title} is now under review.`;
          break;
        case 'approved':
          notificationMessage = `Congratulations! Your application for ${application.job.title} has been approved.`;
          break;
        case 'rejected':
          notificationMessage = `Unfortunately, your application for ${application.job.title} was not selected.`;
          break;
      }
      
      if (notificationMessage) {
        await createNotification(application.jobSeeker.id, notificationMessage);
      }
    } catch (notificationError) {
      console.warn('Failed to create notification:', notificationError.message);
      // Don't fail the status update if notification fails
    }

    res.json({ 
      success: true, 
      application: {
        id: application.id,
        status: application.status,
        job: {
          id: application.job.id,
          title: application.job.title
        },
        jobSeeker: {
          id: application.jobSeeker.id,
          name: application.jobSeeker.name,
          email: application.jobSeeker.email
        }
      }
    });
  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating status', 
      details: err.message 
    });
  }
};