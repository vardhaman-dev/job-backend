module.exports = (sequelize, DataTypes) => {
  const Bookmark = sequelize.define('Bookmark', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    job_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    saved_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'bookmarks',
    timestamps: false
  });

  // 👇 Add this:
  Bookmark.associate = (models) => {
    Bookmark.belongsTo(models.Job, {
      foreignKey: 'job_id',
      as: 'job'
    });
  };

  return Bookmark;
};
