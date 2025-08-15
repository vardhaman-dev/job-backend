import { sequelize } from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';
import { User, UserExperience, JobSeekerProfile, CompanyProfile } from '../models/index.js';

// Helper: calculate total experience in years
const experienceYearsLiteral = sequelize.fn(
  'SUM',
  sequelize.literal("TIMESTAMPDIFF(MONTH, `jobSeekerProfile->experience`.`start_date`, IFNULL(`jobSeekerProfile->experience`.`end_date`, CURDATE())) / 12")
);

export const getSuggestions = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Fetch company profile
    const company = await CompanyProfile.findOne({ where: { userId: companyId } });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    let positions = company.positionsAvailable;

    // Helper function to get experienced users
    const getExperiencedUsers = async (minExperience = 1, limit = 10) => {
      return await User.findAll({
        include: [{
          model: JobSeekerProfile,
          as: 'jobSeekerProfile',
          where: {
            experience_years: { [Op.gte]: minExperience }
          }
        }],
        attributes: ['id', 'name'],
        order: [['jobSeekerProfile', 'experience_years', 'DESC']],
        limit
      });
    };

    if (!positions) {
      // No positions at all - show latest users with good experience
      const latestUsers = await getExperiencedUsers(1, 10);

      return res.json({
        success: true,
        message: 'No positions found — showing experienced job seekers',
        jobseekers: latestUsers
      });
    }

    if (typeof positions === 'string') {
      try {
        positions = JSON.parse(positions);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid company_positions format' });
      }
    }

    if (!Array.isArray(positions)) {
      return res.status(400).json({ error: 'Invalid company_positions format' });
    }

    // If positions array is empty, show latest users with good experience
    if (positions.length === 0) {
      const latestUsers = await getExperiencedUsers(1, 10);

      return res.json({
        success: true,
        message: 'No specific positions available — showing experienced job seekers',
        jobseekers: latestUsers
      });
    }

    // Query users with matching positions
    const jobseekers = await User.findAll({
      include: [{
        model: JobSeekerProfile,
        as: 'jobSeekerProfile',
        where: { title: positions }, // positions is array of titles
        include: [{
          model: UserExperience,
          as: 'experience',
          attributes: []
        }]
      }],
      attributes: [
        'id',
        'name',
        [experienceYearsLiteral, 'totalExperienceYears']
      ],
      group: ['User.id', 'jobSeekerProfile.title'],
      order: [[sequelize.literal('totalExperienceYears'), 'DESC']]
    });

    // If no matching candidates found, show latest users with good experience as fallback
    if (jobseekers.length === 0) {
      const fallbackUsers = await getExperiencedUsers(2, 10);

      return res.json({
        success: true,
        message: `No candidates found for positions: ${positions.join(', ')} — showing experienced job seekers`,
        positions,
        jobseekers: fallbackUsers
      });
    }

    res.json({
      success: true,
      positions,
      jobseekers
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const searchJobseekers = async (req, res) => {
  const { position } = req.query;
  if (!position) return res.status(400).json({ error: 'Position is required' });

  const experienceYearsLiteral = sequelize.fn(
    'SUM',
    sequelize.literal(
      "TIMESTAMPDIFF(MONTH, `jobSeekerProfile->experience`.`start_date`, IFNULL(`jobSeekerProfile->experience`.`end_date`, CURDATE())) / 12"
    )
  );

  try {
    // 1. Exact matches
    const exactMatches = await User.findAll({
      where: { role: 'job_seeker' },
      include: [
        {
          model: JobSeekerProfile,
          as: 'jobSeekerProfile',
          where: { title: { [Op.like]: `%${position}%` } },
          // Include ALL jobseeker profile fields like in suggestions
          include: [
            {
              model: UserExperience,
              as: 'experience',
              attributes: []
            }
          ]
        }
      ],
      attributes: [
        'id',
        'name',
        [experienceYearsLiteral, 'totalExperienceYears']
      ],
      group: ['User.id'],
    });

    const matchedIds = exactMatches.map(m => m.id);

    // 2. Fuzzy Matches
    const fuzzyMatches = await User.findAll({
      where: {
        role: 'job_seeker',
        ...(matchedIds.length ? { id: { [Op.notIn]: matchedIds } } : {})
      },
      include: [
        {
          model: JobSeekerProfile,
          as: 'jobSeekerProfile',
          where: literal(
            `MATCH (title) AGAINST (${sequelize.escape(position)} IN NATURAL LANGUAGE MODE)`
          ),
          include: [
            {
              model: UserExperience,
              as: 'experience',
              attributes: []
            }
          ]
        }
      ],
      attributes: [
        'id',
        'name',
        [experienceYearsLiteral, 'totalExperienceYears']
      ],
      group: ['User.id'],
      order: [literal('totalExperienceYears DESC')]
    });

    res.json({
      jobseekers: [...exactMatches, ...fuzzyMatches]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};