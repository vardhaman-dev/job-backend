const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'internship', 'remote'),
    allowNull: false
  },
  salary_range: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'open', 'closed'),
    allowNull: false,
    defaultValue: 'draft'
  },
  posted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
   deadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  benefits: {
    type: DataTypes.STRING,  // varchar(255) → string in Sequelize
    allowNull: true
  },
  skills: {
  type: DataTypes.JSON,
  allowNull: true,

},
education: {
  type: DataTypes.STRING,
  allowNull: true
},
tags: {
  type: DataTypes.JSON,
  allowNull: true,
},
  category: {                           // ✅ Add this
    type: DataTypes.STRING,
    allowNull: true
  },
  experience_min: {
    type: DataTypes.INTEGER, // e.g., '1-3 years', '5+ years'
    allowNull: true
  }
}, {
  tableName: 'jobs',
  timestamps: false
});

Job.associate = (models) => {
  Job.hasMany(models.Bookmark, {
    foreignKey: 'job_id',
    as: 'bookmarks'
  });
};


module.exports = Job;
