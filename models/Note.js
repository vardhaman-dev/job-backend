// models/Note.js
module.exports = (sequelize, DataTypes) => {
  const Note = sequelize.define(
    "Note",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      job_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "notes",
      timestamps: false, // we already have created_at, but no updated_at
      underscored: true,
      indexes: [{ fields: ["job_id", "user_id"] }],
    }
  );

  // Associations
  Note.associate = (models) => {
    Note.belongsTo(models.Job, {
      foreignKey: "job_id",
      as: "job",
    });
    Note.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "applicant", // applicant = job seeker
    });
  };

  return Note;
};
