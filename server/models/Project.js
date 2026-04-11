const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Project = sequelize.define("Project", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  visibility: {
    type: DataTypes.ENUM('PRIVATE', 'PUBLIC', 'TEAM'),
    defaultValue: 'PRIVATE'
  }
});

module.exports = Project;
