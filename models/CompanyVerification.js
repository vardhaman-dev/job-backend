const { DataTypes, ENUM } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanyVerification = sequelize.define('CompanyVerification', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    comment: 'users.id of company owner',
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at',
  },
  status: {
    type: ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
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
}, {
  tableName: 'company_verifications',
  timestamps: false,
});

// Add associations
CompanyVerification.associate = (models) => {
  // A verification belongs to a company (User)
  CompanyVerification.belongsTo(models.User, {
    foreignKey: 'companyId',
    as: 'company',
    targetKey: 'id'
  });
  
  // A verification can be approved by an admin (User)
  CompanyVerification.belongsTo(models.User, {
    foreignKey: 'verifiedBy',
    as: 'verifier',
    targetKey: 'id'
  });
  
  // A company can have many verifications
  models.User.hasMany(models.CompanyVerification, {
    foreignKey: 'companyId',
    as: 'verifications',
    sourceKey: 'id'
  });
};

module.exports = CompanyVerification;
