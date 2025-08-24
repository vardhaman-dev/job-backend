// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');

// const JobSeekerProfile = sequelize.define('JobSeekerProfile', {
//   userId: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     field: 'user_id',
//     references: {
//       model: 'users',
//       key: 'id',
//     },
//   },
//   resumeLink: {
//     type: DataTypes.STRING(512),
//     allowNull: true,
//     field: 'resume_link',
//   },
//   experienceYears: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//     field: 'experience_years',
//   },
//   skillsJson: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//     field: 'skills_json',
//     get() {
//       const value = this.getDataValue('skillsJson');
//       try {
//         if (!value) return [];
//         if (Array.isArray(value)) return value;
//         if (typeof value === 'string') return JSON.parse(value);
//         return [];
//       } catch (error) {
//         console.error('Error parsing skills JSON:', error);
//         return [];
//       }
//     },
//     set(value) {
//       try {
//         if (Array.isArray(value)) {
//           this.setDataValue('skillsJson', JSON.stringify(value));
//         } else if (typeof value === 'string') {
//           JSON.parse(value);
//           this.setDataValue('skillsJson', value);
//         } else {
//           this.setDataValue('skillsJson', '[]');
//         }
//       } catch (error) {
//         console.error('Error setting skills JSON:', error);
//         this.setDataValue('skillsJson', '[]');
//       }
//     }
//   },

//   // 🔽 NEW FIELDS
//   phoneNumber: {
//     type: DataTypes.STRING(20),
//     allowNull: true,
//     field: 'phone_number'
//   },
//   address: {
//     type: DataTypes.STRING(255),
//     allowNull: true,
//     field: 'address'
//   },
//   zipcode: {
//     type: DataTypes.STRING(10),
//     allowNull: true,
//     field: 'zipcode'
//   },
//   summary: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//     field: 'summary'
//   },
//   photoUrl: {
//     type: DataTypes.STRING(512),
//     allowNull: true,
//     field: 'photo_url'
//   }

// }, {
//   tableName: 'job_seeker_profiles',
//   timestamps: false,
//   underscored: true,
// });

// module.exports = JobSeekerProfile;

// models/JobSeekerProfile.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class JobSeekerProfile extends Model {}

  JobSeekerProfile.init(
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
      resumeLink: {
        type: DataTypes.STRING(512),
        allowNull: true,
        field: 'resume_link',
        validate: {
          isUrl: { msg: 'Invalid resume URL' },
        },
      },
      experienceYears: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'experience_years',
        validate: {
          isInt: { msg: 'Experience years must be an integer' },
          min: { args: 0, msg: 'Experience years cannot be negative' },
        },
      },
      skillsJson: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'skills_json',
        get() {
          const value = this.getDataValue('skillsJson');
          try {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') return JSON.parse(value);
            return [];
          } catch (error) {
            console.error('Error parsing skills JSON:', error);
            return [];
          }
        },
        set(value) {
          try {
            if (Array.isArray(value)) {
              this.setDataValue('skillsJson', JSON.stringify(value));
            } else if (typeof value === 'string') {
              JSON.parse(value); // Validate JSON
              this.setDataValue('skillsJson', value);
            } else {
              this.setDataValue('skillsJson', '[]');
            }
          } catch (error) {
            console.error('Error setting skills JSON:', error);
            this.setDataValue('skillsJson', '[]');
          }
        },
      },
      phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'phone_number',
        validate: {
          is: {
            args: /^[0-9+\-\s()]*$/, // Basic phone number format
            msg: 'Invalid phone number format',
          },
        },
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'address',
      },
      zipcode: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'zipcode',
        validate: {
          is: {
            args: /^[0-9]{5}(-[0-9]{4})?$/, // US zipcode format, adjust as needed
            msg: 'Invalid zipcode format',
          },
        },
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'summary',
      },
      photoUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
        field: 'photo_url',
        validate: {
          isUrl: { msg: 'Invalid photo URL' },
        },
      },
    },
    {
      sequelize,
      modelName: 'JobSeekerProfile',
      tableName: 'job_seeker_profiles',
      timestamps: false,
      underscored: true,
    }
  );

  return JobSeekerProfile;
};