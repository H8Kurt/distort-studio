const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Session = sequelize.define('Session', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  durationSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  meta: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
});

module.exports = Session;
