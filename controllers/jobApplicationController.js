const { JobApplication, Job,User,JobSeekerProfile } = require('../models');
const path = require('path');

// Apply to a job
exports.applyToJob = async (req, res) => {
  try {
    console.log('Apply controller HIT');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const { job_id, cover_letter } = req.body;
    const job_seeker_id = req.user.id;

    // If a file was uploaded, build the resume link URL
    const resume_link = req.file ? `/uploads/resumes/${req.file.filename}` : null;

    console.log(`Data to save: job_id=${job_id}, job_seeker_id=${job_seeker_id}, cover_letter=${cover_letter}, resume_link=${resume_link}`);

    // Check if job exists
    const job = await Job.findByPk(job_id);
    if (!job) {
      console.log('Job not found for id:', job_id);
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Prevent duplicate applications
    const existing = await JobApplication.findOne({ where: { job_id, job_seeker_id } });
    if (existing) {
      console.log('Duplicate application found');
      return res.status(400).json({ success: false, message: 'Already applied to this job' });
    }

    // Create the application record
    const application = await JobApplication.create({
      job_id,
      job_seeker_id,
      cover_letter,
      resume_link,
      status: 'applied',
      applied_at: new Date()
    });

    console.log('Application saved:', application.toJSON());

    res.status(201).json({ success: true, application });

  } catch (err) {
    console.error('Apply controller error:', err);
    res.status(500).json({ success: false, message: 'Failed to apply to job' });
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
exports.getCompanyCandidates = async (req, res) => {
  try {
    const company_id = req.params.companyId;  // <-- take from URL

    const applications = await JobApplication.findAll({
      include: [
        {
          model: Job,
          as: 'job',
          where: { company_id },    // filter by company id
          attributes: ['id', 'title']
        },
        {
          model: User,
          as: 'jobSeeker',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: ['id', 'cover_letter', 'resume_link', 'status', 'applied_at']
    });

    res.json({ success: true, applications });
  } catch (err) {
    console.error('Error fetching company candidates:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch company candidates' });
  }
};