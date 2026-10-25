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
  meta: { type: DataTypes.JSON, defaultValue: {} },
  // Идентификатор, сгенерированный на клиенте — нужен для оффлайн-синхронизации.
  clientId: { type: DataTypes.STRING, allowNull: true }
}, {
  indexes: [{ unique: true, fields: ['userId', 'clientId'] }]
});

module.exports = Session;
