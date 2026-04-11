const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Media = sequelize.define("Media", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  filename: DataTypes.STRING,
  originalName: DataTypes.STRING,
  mime: DataTypes.STRING,
  size: DataTypes.INTEGER,
  url: DataTypes.STRING,
  thumbUrl: DataTypes.STRING,
  type: DataTypes.STRING
});

module.exports = Media;
