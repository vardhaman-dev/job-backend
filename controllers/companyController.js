// controllers/companyController.js
const CompanyProfile = require('../models/CompanyProfile');
const User = require('../models/User');

exports.getCompanyWithUserInfo = async (req, res) => {
  try {
    const { user_id } = req.params;

    const company = await CompanyProfile.findOne({
      where: { userId: user_id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role', 'status']
        }
      ]
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
};


// UPDATE company profile
exports.updateCompanyProfile = async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      companyName,
      contactNumber,
      logo,
      website,
      description,
      industry,
      location,
      positionsAvailable,
      numberOfEmployees
    } = req.body;

    const company = await CompanyProfile.findOne({ where: { userId: user_id } });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    await company.update({
      companyName,
      contactNumber,
      logo,
      website,
      description,
      industry,
      location,
      positionsAvailable,
      numberOfEmployees
    });

    res.json({ success: true, message: 'Company updated successfully', company });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};