const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserExperience = sequelize.define('UserExperience', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title: DataTypes.STRING,
  company: DataTypes.STRING,
  description: DataTypes.TEXT,
  start_date: DataTypes.DATE,
  end_date: DataTypes.DATE,
}, {
  tableName: 'user_experience',
  timestamps: false
});

module.exports = UserExperience;
