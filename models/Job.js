// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');

// const Job = sequelize.define('Job', {
//   company_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false
//   },
//   title: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   description: {
//     type: DataTypes.TEXT,
//     allowNull: false
//   },
//   location: {
//     type: DataTypes.STRING,
//     allowNull: true
//   },
//   type: {
//     type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'internship', 'remote'),
//     allowNull: false
//   },
//   salary_range: {
//     type: DataTypes.STRING,
//     allowNull: true
//   },
//   status: {
//     type: DataTypes.ENUM('draft', 'open', 'closed'),
//     allowNull: false,
//     defaultValue: 'draft'
//   },
//   posted_at: {
//     type: DataTypes.DATE,
//     allowNull: false,
//     defaultValue: DataTypes.NOW
//   },
//   deadline: {
//     type: DataTypes.DATEONLY,
//     allowNull: true
//   },
//   benefits: {
//     type: DataTypes.STRING,
//     allowNull: true
//   },
//   education: {
//     type: DataTypes.STRING,
//     allowNull: true
//   },
//   submitted_at: {
//     type: DataTypes.DATE,
//     allowNull: true
//   },
//   skills: {
//     type: DataTypes.JSON,
//     allowNull: true
//   },
//   tags: {
//     type: DataTypes.JSON,
//     allowNull: true
//   },
//   category: {
//     type: DataTypes.STRING,
//     allowNull: true
//   }
// }, {
//   tableName: 'jobs',
//   timestamps: false
// });


// module.exports = Job;

// models/Job.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Job extends Model {}

  Job.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
        validate: {
          notNull: { msg: 'Company ID is required' },
        },
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Job title is required' },
          len: [3, 255],
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Job description is required' },
        },
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'internship', 'remote'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['full_time', 'part_time', 'contract', 'internship', 'remote']],
            msg: 'Invalid job type',
          },
        },
      },
      salaryRange: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'salary_range',
      },
      status: {
        type: DataTypes.ENUM('draft', 'open', 'closed'),
        allowNull: false,
        defaultValue: 'draft',
        validate: {
          isIn: {
            args: [['draft', 'open', 'closed']],
            msg: 'Invalid job status',
          },
        },
      },
      postedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'posted_at',
      },
      deadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      benefits: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      education: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submitted_at',
      },
      skills: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
          const value = this.getDataValue('skills');
          return value ? (typeof value === 'string' ? JSON.parse(value) : value) : [];
        },
        set(value) {
          this.setDataValue('skills', value ? JSON.stringify(value) : null);
        },
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
          const value = this.getDataValue('tags');
          return value ? (typeof value === 'string' ? JSON.parse(value) : value) : [];
        },
        set(value) {
          this.setDataValue('tags', value ? JSON.stringify(value) : null);
        },
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Job',
      tableName: 'jobs',
      timestamps: false,
      underscored: true,
    }
  );

  return Job;
};