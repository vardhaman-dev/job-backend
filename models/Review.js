const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'company_profiles', // Assuming your company profile table name
      key: 'id'
    }
  },
  reviewer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users', // Assuming your users table name
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.TINYINT,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  visible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'company_reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Add associations
Review.associate = (models) => {
  Review.belongsTo(models.User, {
    foreignKey: 'reviewer_id',
    as: 'reviewer'
  });
  
  Review.belongsTo(models.CompanyProfile, {
    foreignKey: 'company_id',
    as: 'company'
  });
};

module.exports = Review;
