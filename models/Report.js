module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    reporter_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    target_type: {
      type: DataTypes.ENUM('company', 'job_seeker'),
      allowNull: false
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'comment'
    },
    status: {
      type: DataTypes.ENUM('open', 'reviewed', 'dismissed'),
      defaultValue: 'open',
      field: 'status'
    },
    resolved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'resolved_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'reports',
    timestamps: false, // Disable automatic timestamps
    underscored: true,
    defaultScope: {
      attributes: { exclude: ['resolved_by', 'resolved_at'] }
    }
  });

  return Report;
};
