module.exports = (sequelize, DataTypes) => {
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
      field: 'submitted_at',
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
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
      references: {
        model: 'users',
        key: 'id',
      },
    },
    rejectedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'rejected_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
    },
  }, {
    tableName: 'company_verifications',
    timestamps: false,
    indexes: [
      {
        fields: ['company_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['verified_at'],
      }
    ],
  });

  CompanyVerification.associate = function(models) {
    // Company that this verification belongs to
    CompanyVerification.belongsTo(models.User, {
      foreignKey: 'companyId',
      as: 'company',
      onDelete: 'CASCADE'
    });
    
    // Admin who verified the company
    CompanyVerification.belongsTo(models.User, {
      foreignKey: 'verifiedBy',
      as: 'verifiedByAdmin',
      onDelete: 'SET NULL'
    });
    
    // Admin who rejected the company
    CompanyVerification.belongsTo(models.User, {
      foreignKey: 'rejectedBy',
      as: 'rejectedByAdmin',
      onDelete: 'SET NULL'
    });
  };

  return CompanyVerification;
};