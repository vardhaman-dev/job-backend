const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class UserExperience extends Model {}

  UserExperience.init(
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
      title: {
        type: DataTypes.STRING,
        allowNull: true
      },
      company: {
        type: DataTypes.STRING,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
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
      modelName: 'UserExperience',
      tableName: 'user_experience',
      timestamps: false,
      underscored: true
    }
  );

  return UserExperience;
};