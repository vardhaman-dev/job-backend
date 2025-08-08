const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserEducation = sequelize.define('UserEducation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  school: DataTypes.STRING,
  degree: DataTypes.STRING,
  field: DataTypes.STRING,
  start_date: DataTypes.DATE,
  end_date: DataTypes.DATE,
}, {
  tableName: 'user_education',
  timestamps: false
});

module.exports = UserEducation;
