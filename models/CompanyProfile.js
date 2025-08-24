// models/CompanyProfile.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CompanyProfile extends Model {}

  CompanyProfile.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
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
        validate: {
          notEmpty: { msg: 'Company name is required' },
        },
      },
      contactNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'contact_number',
        validate: {
          len: [0, 50],
        },
      },
      logo: {
        type: DataTypes.STRING(512),
        allowNull: true,
        field: 'logo',
      },
      website: {
        type: DataTypes.STRING(512),
        allowNull: true,
        validate: {
          isUrl: { msg: 'Invalid website URL' },
        },
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
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: {
            args: [['pending', 'approved', 'rejected']],
            msg: 'Invalid status specified',
          },
        },
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
          isUrl: { msg: 'Invalid LinkedIn URL' },
        },
      },
    },
    {
      sequelize,
      modelName: 'CompanyProfile',
      tableName: 'company_profiles',
      timestamps: false,
      underscored: true,
    }
  );

  return CompanyProfile;
};