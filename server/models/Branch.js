const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Branch = sequelize.define('Branch', {
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'main',
  },
  versionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Branch;
