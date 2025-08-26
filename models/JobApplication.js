const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JobApplication = sequelize.define('JobApplication', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    job_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    job_seeker_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cover_letter: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resume_link: {
  type: DataTypes.STRING(512),
  allowNull: true,
},
status: {
  type: DataTypes.STRING(20),
  defaultValue: 'applied',
},
 ats_score: {                  // << new column
      type: DataTypes.INTEGER,    // store score as integer (0-100)
      allowNull: true,
    },
ats_feedback: {
      type: DataTypes.TEXT,      // ✅ feedback text
      allowNull: true
    },
    applied_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'applications',
    timestamps: false,
  });

  JobApplication.associate = (models) => {
    // Optional: convenience link to notes via (job_id, user_id) pattern
    // No direct FK here; we'll query by where clause
    JobApplication.belongsTo(models.Job, { foreignKey: "job_id", as: "job" });
    JobApplication.belongsTo(models.User, { foreignKey: "job_seeker_id", as: "applicant" });
  };
  return JobApplication;
};
