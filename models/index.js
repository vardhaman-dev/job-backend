const { sequelize } = require('../config/database');
const User = require('./User');
const CompanyProfile = require('./CompanyProfile');
const CompanyVerification = require('./CompanyVerification');
const JobSeekerProfile = require('./JobSeekerProfile');
const Job = require('./Job');
const AdminLog = require('./AdminLog');

 
// Define associations
// User to CompanyProfile (One-to-One)
User.hasOne(CompanyProfile, {
  foreignKey: 'userId',
  as: 'companyProfile',
  onDelete: 'CASCADE',
  hooks: true
});

CompanyProfile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User to JobSeekerProfile (One-to-One)
User.hasOne(JobSeekerProfile, {
  foreignKey: 'userId',
  as: 'jobSeekerProfile',
  onDelete: 'CASCADE',
  hooks: true
});

JobSeekerProfile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Set up associations for AdminLog (One-to-Many)
User.hasMany(AdminLog, {
  foreignKey: 'adminId',
  as: 'adminLogs',
  onDelete: 'CASCADE'
});

AdminLog.belongsTo(User, {
  foreignKey: 'adminId',
  as: 'admin'
});

// Company to CompanyVerification (One-to-Many)
User.hasMany(CompanyVerification, {
  foreignKey: 'companyId',
  as: 'verifications',
  onDelete: 'CASCADE'
});

CompanyVerification.belongsTo(User, {
  foreignKey: 'companyId',
  as: 'company'
});

// Admin to CompanyVerification (One-to-Many)
User.hasMany(CompanyVerification, {
  foreignKey: 'verifiedBy',
  as: 'verifiedCompanies'
});

CompanyVerification.belongsTo(User, {
  foreignKey: 'verifiedBy',
  as: 'verifiedByAdmin'
});

// Company to Jobs (One-to-Many)
User.hasMany(Job, {
  foreignKey: 'company_id',
  as: 'jobs',
  onDelete: 'CASCADE'
});

Job.belongsTo(User, {
  foreignKey: 'company_id',
  as: 'company'
});

// Job to CompanyProfile (Many-to-One through User)
Job.belongsTo(CompanyProfile, {
  foreignKey: 'company_id',
  targetKey: 'userId',
  as: 'companyProfile'
});

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  CompanyProfile,
  CompanyVerification,
  JobSeekerProfile,
  Job,
  AdminLog,
};
