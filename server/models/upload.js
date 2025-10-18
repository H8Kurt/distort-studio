// models/Upload.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Upload = sequelize.define("Upload", {
  filename: { type: DataTypes.STRING, allowNull: false },
  thumb: { type: DataTypes.STRING, allowNull: true },
});

module.exports = Upload;
