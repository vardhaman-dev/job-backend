// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');

// const AdminLog = sequelize.define('AdminLog', {
//   id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   adminId: {
//     type: DataTypes.INTEGER,
//     allowNull: true,  // Nullable for unauthenticated actions
//     references: {
//       model: 'users',
//       key: 'id',
//     },
//     field: 'admin_id'
//   },
//   action: {
//     type: DataTypes.STRING,  // Changed from ENUM to STRING for more flexibility
//     allowNull: false,
//     comment: 'Type of admin action performed'
//   },
//   ipAddress: {
//     type: DataTypes.STRING,
//     allowNull: true,
//     field: 'ip_address',
//     comment: 'IP address from which the action was performed'
//   },
//   userAgent: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//     field: 'user_agent',
//     comment: 'Browser/device information'
//   },
//   status: {
//     type: DataTypes.ENUM('success', 'failed'),
//     allowNull: false,
//     comment: 'Whether the action was successful or not'
//   },
//   details: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//     comment: 'Additional details or error message'
//   },
//   // Timestamps are automatically added by the model options below
// }, {
//   tableName: 'admin_logs',
//   timestamps: true,  // Adds createdAt and updatedAt
//   underscored: true,  // Uses snake_case for column names
//   createdAt: 'created_at',
//   updatedAt: 'updated_at',
//   indexes: [
//     {
//       fields: ['admin_id'],
//       name: 'idx_admin_logs_admin_id'
//     },
//     {
//       fields: ['created_at'],
//       name: 'idx_admin_logs_created_at'
//     }
//   ]
// });

// module.exports = AdminLog;

// models/AdminLog.js
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class AdminLog extends Model {}

  AdminLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      adminId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Nullable for unauthenticated actions
        field: 'admin_id',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Action is required' },
          len: [1, 100],
        },
        comment: 'Type of admin action performed',
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'ip_address',
        validate: {
          isIP: { msg: 'Invalid IP address format' }, // Requires validator package
        },
        comment: 'IP address from which the action was performed',
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'user_agent',
        comment: 'Browser/device information',
      },
      status: {
        type: DataTypes.ENUM('success', 'failed'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['success', 'failed']],
            msg: 'Invalid status',
          },
        },
        comment: 'Whether the action was successful or not',
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional details or error message',
      },
    },
    {
      sequelize,
      modelName: 'AdminLog',
      tableName: 'admin_logs',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          fields: ['admin_id'],
          name: 'idx_admin_logs_admin_id',
        },
        {
          fields: ['created_at'],
          name: 'idx_admin_logs_created_at',
        },
      ],
    }
  );

  return AdminLog;
};