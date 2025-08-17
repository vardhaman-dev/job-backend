const express = require('express');
const router = express.Router();
const User = require('../models/User');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const UserEducation = require('../models/UserEducation');
const UserExperience = require('../models/UserExperience');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const upload = multer({ storage: multer.memoryStorage() });

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const BUCKET_PHOTO = process.env.BUCKET_PHOTO || 'photo';
const BUCKET_RESUMES = process.env.BUCKET_RESUMES || 'resumes';

// Helper to sanitize filenames
function sanitizeName(name) {
  return name.replace(/[^\w.\-]+/g, "_");
}

// ------------------ PROFILE ROUTES ------------------

// GET full profile
router.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findByPk(userId, { attributes: ['name', 'email', 'status'] });
    const profile = await JobSeekerProfile.findOne({
      where: { userId },
      include: [
        { model: UserEducation, as: 'education' },
        { model: UserExperience, as: 'experience' }
      ]
    });

    if (!user || !profile) return res.status(404).json({ error: 'User profile not found' });

    const [firstName, ...last] = user.name.split(' ');
    const lastName = last.join(' ');

    res.json({
      firstName,
      lastName,
      email: user.email,
      title: profile.title || '',
      status: user.status,
      photo: profile.photoUrl || null,
      resume: profile.resumeLink || '',
      resumeType: profile.resumeLink?.endsWith('.pdf') ? 'pdf' : 'image',
      skills: profile.skillsJson || [],
      experienceYears: profile.experienceYears || 0,
      phoneNumber: profile.phoneNumber || '',
      streetAddress: profile.address || '',
      zipcode: profile.zipcode || '',
      summary: profile.summary || '',
      education: profile.education || [],
      experience: profile.experience || []
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE full profile
router.put('/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const {
    firstName, lastName, title, email, phoneNumber, streetAddress,
    zipcode, summary, photo, resume, experienceYears, skills,
    education, experience
  } = req.body;

  try {
    await User.update({ name: `${firstName} ${lastName}`, email }, { where: { id: userId } });

    await JobSeekerProfile.update({
      phoneNumber,
      address: streetAddress,
      title,
      zipcode,
      summary,
      photoUrl: photo,
      resumeLink: resume,
      experienceYears,
      skillsJson: skills
    }, { where: { userId } });

    // Update Education
    if (Array.isArray(education)) {
      await UserEducation.destroy({ where: { user_id: userId } });
      await Promise.all(education.map(item =>
        UserEducation.create({ user_id: userId, ...item })
      ));
    }

    // Update Experience
    if (Array.isArray(experience)) {
      await UserExperience.destroy({ where: { user_id: userId } });
      await Promise.all(experience.map(item =>
        UserExperience.create({ user_id: userId, ...item })
      ));
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE profile status
router.put('/profile/:userId/status', async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.status = status;
    await user.save();

    res.json({ message: `Status updated to ${status}`, status });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload photo
router.post("/photo/:userId", upload.single("photo"), async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const profile = await JobSeekerProfile.findOne({ where: { userId } });

    // Delete previous photo if exists
    if (profile?.photoUrl) {
      const path = profile.photoUrl.split(`${BUCKET_PHOTO}/`)[1];
      if (path) await supabase.storage.from(BUCKET_PHOTO).remove([path]);
    }

    const path = `user_${userId}/${Date.now()}_${sanitizeName(req.file.originalname)}`;
    const { error: upErr } = await supabase.storage.from(BUCKET_PHOTO)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (upErr) return res.status(400).json({ error: upErr.message });

    const { data: publicData } = supabase.storage.from(BUCKET_PHOTO).getPublicUrl(path);
    await JobSeekerProfile.update({ photoUrl: publicData.publicUrl }, { where: { userId } });

    res.json({ url: publicData.publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Upload resume
router.post("/resume/:userId", upload.single("resume"), async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const profile = await JobSeekerProfile.findOne({ where: { userId } });

    // Delete previous resume if exists
    if (profile?.resumeLink) {
      const path = profile.resumeLink.split(`${BUCKET_RESUMES}/`)[1];
      if (path) await supabase.storage.from(BUCKET_RESUMES).remove([path]);
    }

    const path = `user_${userId}/${Date.now()}_${sanitizeName(req.file.originalname)}`;
    const { error: upErr } = await supabase.storage.from(BUCKET_RESUMES)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (upErr) return res.status(400).json({ error: upErr.message });

    const { data: publicData } = supabase.storage.from(BUCKET_RESUMES).getPublicUrl(path);
    await JobSeekerProfile.update({ resumeLink: publicData.publicUrl }, { where: { userId } });

    res.json({ url: publicData.publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
