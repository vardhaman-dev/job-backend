const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class UserEducation extends Model {}

  UserEducation.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: 'User ID is required' }
        }
      },
      school: {
        type: DataTypes.STRING,
        allowNull: true
      },
      degree: {
        type: DataTypes.STRING,
        allowNull: true
      },
      field: {
        type: DataTypes.STRING,
        allowNull: true
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'UserEducation',
      tableName: 'user_education',
      timestamps: false,
      underscored: true
    }
  );

  return UserEducation;
};