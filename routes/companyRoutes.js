const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { isLoggedIn,protect } = require('../middleware/authMiddleware');
const CompanyProfile = require('../models/CompanyProfile');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const BUCKET_PHOTO = process.env.BUCKET_PHOTO || 'photo';

router.get('/company/status', isLoggedIn, companyController.getEmployerStatus); // fix here
router.get('/company/:user_id', companyController.getCompanyWithUserInfo);
router.put('/companies/:user_id', companyController.updateCompanyProfile);
router.post('/companies/photo/:userId', upload.single('photo'), async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const profile = await CompanyProfile.findOne({ where: { userId } });
    if (!profile) return res.status(404).json({ error: "Company not found" });

    // Delete previous photo if exists
    if (profile.logo) {
      const pathToDelete = profile.logo.split(`${BUCKET_PHOTO}/`)[1];
      if (pathToDelete) {
        await supabase.storage.from(BUCKET_PHOTO).remove([pathToDelete]);
      }
    }

    // Generate a safe path for the new file
    const timestamp = Date.now();
    const fileName = req.file.originalname.replace(/\s+/g, '_'); // simple sanitize
    const filePath = `user_${userId}/${timestamp}_${fileName}`;

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_PHOTO)
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadError) return res.status(400).json({ error: uploadError.message });

    // Get public URL
    const { data: publicData } = supabase.storage.from(BUCKET_PHOTO).getPublicUrl(filePath);

    // Update company profile
    await CompanyProfile.update(
      { logo: publicData.publicUrl },
      { where: { userId } }
    );

    res.json({ url: publicData.publicUrl });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});
router.post('/company/report/:companyId', protect, companyController.reportCompany);

// Get company status for dashboard
router.get('/company/:companyId/status', protect, companyController.getCompanyStats);


module.exports = router;
