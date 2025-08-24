const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Initialize models
const User = require('./User')(sequelize, DataTypes);
const CompanyProfile = require('./CompanyProfile')(sequelize, DataTypes);
const JobSeekerProfile = require('./JobSeekerProfile')(sequelize, DataTypes);
const Job = require('./Job')(sequelize, DataTypes);
const Bookmark = require('./Bookmark')(sequelize, DataTypes);
const AdminLog = require('./AdminLog')(sequelize, DataTypes);
const JobApplication = require('./JobApplication')(sequelize, DataTypes);
const UserEducation = require('./UserEducation')(sequelize, DataTypes);
const UserExperience = require('./UserExperience')(sequelize, DataTypes);

// Define associations
Job.hasMany(JobApplication, { foreignKey: 'job_id', as: 'applications' });
JobApplication.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

User.hasMany(JobApplication, { foreignKey: 'job_seeker_id', as: 'jobApplications' });
JobApplication.belongsTo(User, { foreignKey: 'job_seeker_id', as: 'jobSeeker' });

User.hasOne(CompanyProfile, { foreignKey: 'userId', as: 'companyProfile', onDelete: 'CASCADE', hooks: true });
CompanyProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(JobSeekerProfile, { foreignKey: 'userId', as: 'jobSeekerProfile', onDelete: 'CASCADE', hooks: true });
JobSeekerProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

JobSeekerProfile.hasMany(UserEducation, { foreignKey: 'user_id', as: 'education', onDelete: 'CASCADE' });
UserEducation.belongsTo(JobSeekerProfile, { foreignKey: 'user_id', as: 'jobSeeker' });

JobSeekerProfile.hasMany(UserExperience, { foreignKey: 'user_id', as: 'experience', onDelete: 'CASCADE' });
UserExperience.belongsTo(JobSeekerProfile, { foreignKey: 'user_id', as: 'jobSeeker' });

User.hasMany(AdminLog, { foreignKey: 'adminId', as: 'adminLogs', onDelete: 'CASCADE' });
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

Bookmark.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

Job.belongsTo(User, { foreignKey: 'company_id', as: 'companyUser' });

Job.belongsTo(CompanyProfile, { foreignKey: 'company_id', targetKey: 'userId', as: 'company' });
CompanyProfile.hasMany(Job, { foreignKey: 'company_id', sourceKey: 'userId', as: 'jobs' });

module.exports = {
  sequelize,
  User,
  CompanyProfile,
  JobSeekerProfile,
  Job,
  Bookmark,
  AdminLog,
  JobApplication,
  UserEducation,
  UserExperience
};

// Test connection
sequelize
  .authenticate()
  .then(() => console.log('✅ Database connection successful'))
  .catch((err) => console.error('Database connection failed:', err));