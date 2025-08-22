const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { isLoggedIn } = require('../middleware/authMiddleware');
const { applyJobValidator } = require('../validations/applicationValidators');
const { validate } = require('../middleware/validationMiddleware');
const { applyToJob, getMyApplications } = require('../controllers/jobApplicationController');
const { getCompanyCandidates } = require('../controllers/jobApplicationController');
const { JobApplication, Job, User } = require('../models'); 
const { createNotification } = require('../utils/notificationService');

// adjust path according to where your models/index.js is

const app = require('../app');
// Add logging wrappers around middleware to detect hangs
const logMiddleware = (name, fn) => (req, res, next) => {
  console.log(`[Middleware] ${name} start`);
  return fn(req, res, (...args) => {
    console.log(`[Middleware] ${name} end`);
    next(...args);
  });
};

// Setup multer storage and file filter
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes/');  // make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC and DOCX files are allowed'));
  }
};

const upload = multer({ storage, fileFilter });

router.post(
  '/apply',
  logMiddleware('isLoggedIn', isLoggedIn),

  // Multer middleware before validation to parse multipart/form-data
  logMiddleware('upload.single', upload.single('resume')),

  // Validation runs after multer populates req.body
  logMiddleware('applyJobValidator', (req, res, next) => {
    Promise.all(applyJobValidator.map((v) => v.run(req)))
      .then(() => {
        console.log('[Middleware] applyJobValidator end');
        next();
      })
      .catch(next);
  }),

  logMiddleware('validate', validate([])),

  applyToJob
);

// Get my applications
router.get('/my-applications', isLoggedIn, getMyApplications);


router.get('/company-candidates/:companyId', getCompanyCandidates);
// PUT /applications/:applicationId/status
router.put('/:applicationId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const id = parseInt(req.params.applicationId, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    const application = await JobApplication.findByPk(id, {
      include: [
        { model: Job, as: 'job' },
        { model: User, as: 'jobSeeker' }
      ]
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update status
    application.status = status;
    await application.save();

    // 🔔 Create notification for the candidate
    if (status === "rejected") {
      await createNotification(application.jobSeeker.id, "Unfortunately, your application was rejected.");
    } else if (status === "approved") {
      await createNotification(application.jobSeeker.id, "Congratulations! You’ve been shortlisted!");
    }

    res.json({ success: true, status: application.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating status', details: err.message });
  }
});


module.exports = router;
