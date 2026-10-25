const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Challenge = sequelize.define('Challenge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  theme: { type: DataTypes.STRING, defaultValue: 'Другое' },
  coverUrl: { type: DataTypes.STRING },
  mode: {
    type: DataTypes.ENUM('art', 'music', 'writing', 'any'),
    defaultValue: 'any',
  },
  // Когда челлендж стартует/завершается (оба могут быть null)
  startsAt: { type: DataTypes.DATE, defaultValue: null },
  endsAt: { type: DataTypes.DATE, defaultValue: null },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'ended'),
    defaultValue: 'active',
  },
  // Автор челленджа
  createdById: { type: DataTypes.INTEGER, allowNull: false },
});

module.exports = Challenge;
