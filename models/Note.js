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
        // assuming this is the applicant (job_seeker_id)
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
      timestamps: false,
      underscored: true,
      indexes: [
        // fast lookup by (job_id, user_id)
        { fields: ["job_id", "user_id"] },
      ],
    }
  );

  Note.associate = (models) => {
    Note.belongsTo(models.Job, { foreignKey: "job_id", as: "job" });
    Note.belongsTo(models.User, { foreignKey: "user_id", as: "applicant" });
  };

  return Note;
};
