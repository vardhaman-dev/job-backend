module.exports = (sequelize, DataTypes) => {
  const ReportCounter = sequelize.define('ReportCounter', {
    target_type: {
      type: DataTypes.ENUM('company', 'job_seeker'),
      allowNull: false,
      primaryKey: true,
      field: 'target_type'
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'target_id'
    },
    report_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'report_count'
    },
    last_report_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_report_at'
    }
  }, {
    tableName: 'report_counters',
    timestamps: false,
    underscored: true
  });

  return ReportCounter;
};
