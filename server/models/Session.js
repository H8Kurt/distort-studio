const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  startTime: DataTypes.DATE,
  endTime: DataTypes.DATE,
  durationSeconds: { type: DataTypes.INTEGER, defaultValue: 0 },
  meta: { type: DataTypes.JSON, defaultValue: {} }
});

module.exports = Session;
