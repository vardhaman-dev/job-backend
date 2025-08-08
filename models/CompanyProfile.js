const { DataTypes, ENUM } = require('sequelize');
const { sequelize } = require('../config/database');

// Define the CompanyProfile model
const CompanyProfile = sequelize.define('CompanyProfile', {
  userId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  companyName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'company_name',
  },
  contactNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'contact_number',
  },
  logo: {
    type: DataTypes.STRING(512),
    allowNull: true,
    field: 'logo',
  },
  website: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  industry: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'location',
  },
  status: {
    type: ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at',
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verified_at',
  },
  verifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'verified_by',
    comment: 'users.id of approving admin',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
  },
  linkedinUrl: {
    type: DataTypes.STRING(512),
    allowNull: true,
    field: 'linkedin_url',
    validate: {
      isUrl: true,
    },
  },
}, {
  tableName: 'company_profiles',
  timestamps: false, // Disable timestamps since they don't exist in the database
  underscored: true,
});

// Add associations
CompanyProfile.associate = (models) => {
  CompanyProfile.hasMany(models.CompanyVerification, {
    foreignKey: 'companyId',
    sourceKey: 'userId',
    as: 'verifications'
  });
};

module.exports = CompanyProfile;
