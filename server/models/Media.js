const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Media = sequelize.define("Media", {
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  originalName: DataTypes.STRING,
  mime: DataTypes.STRING,
  size: DataTypes.INTEGER,

  url: DataTypes.STRING,
  thumbUrl: DataTypes.STRING,

  type: {
    type: DataTypes.STRING, // image | audio
  },

  // 🔥 ВАЖНО: ЯВНОЕ ПОЛЕ
  ProjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Media;
