const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const Project = sequelize.define('Project', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
});

User.hasMany(Project);
Project.belongsTo(User);

module.exports = Project;
