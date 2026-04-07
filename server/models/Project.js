const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Project = sequelize.define("Project", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: DataTypes.TEXT,
  visibility: {
    type: DataTypes.ENUM('PRIVATE', 'PUBLIC', 'TEAM'),
    defaultValue: 'PRIVATE'
  }
});

module.exports = Project;
