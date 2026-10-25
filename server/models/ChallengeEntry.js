const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ChallengeEntry = sequelize.define('ChallengeEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  challengeId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  // Необязательная привязка к проекту автора
  projectId: { type: DataTypes.INTEGER, defaultValue: null },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  // Обложка/превью работы
  imageUrl: { type: DataTypes.STRING },
  votesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = ChallengeEntry;
