const express = require('express');
const router = express.Router();
const User = require('../models/User');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const UserEducation = require('../models/UserEducation');
const UserExperience = require('../models/UserExperience');

// GET /api/profile/:userId
router.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId, {
      attributes: ['name', 'email']
    });

    const profile = await JobSeekerProfile.findOne({
      where: { userId },
      include: [
        { model: UserEducation, as: 'education' },
        { model: UserExperience, as: 'experience' }
      ]
    });

    if (!user || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Split full name
    const [firstName, ...last] = user.name.split(' ');
    const lastName = last.join(' ');

    const fullProfile = {
      firstName,
      lastName,
      email: user.email,
      photo: profile.photoUrl || null,
      resume: profile.resumeLink || '',
      resumeType: profile.resumeLink?.endsWith('.pdf') ? 'pdf' : 'image',
      skills: profile.skillsJson || [],
      experienceYears: profile.experienceYears || 0,

      // Profile fields from job_seeker_profiles
      phoneNumber: profile.phoneNumber || '',
      streetAddress: profile.address || '',
      zipcode: profile.zipcode || '',
      summary: profile.summary || '',

      // Related tables (these will be null or arrays depending on associations)
      education: profile.education || [],
      experience: profile.experience || []
    };

    res.json(fullProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    streetAddress,
    zipcode,
    summary,
    photo,
    resume,
    resumeType,
    experienceYears,
    skills,
    education,
    experience
  } = req.body;

  try {
    // Update User table
    await User.update(
      { name: `${firstName} ${lastName}`, email },
      { where: { id: userId } }
    );

    // Update JobSeekerProfile
    await JobSeekerProfile.update({
      phoneNumber,
      address: streetAddress,
      zipcode,
      summary,
      photoUrl: photo,
      resumeLink: resume,
      experienceYears,
      skillsJson: skills
    }, { where: { userId } });

    // Optional: Update Education and Experience (first delete, then recreate for simplicity)
    if (Array.isArray(education)) {
      await UserEducation.destroy({ where: { user_id: userId } });
      await Promise.all(education.map(item =>
        UserEducation.create({ user_id: userId, ...item })
      ));
    }

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

module.exports = router;
