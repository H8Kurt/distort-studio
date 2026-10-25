const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Asset = sequelize.define('Asset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.FLOAT, defaultValue: 0 },
  category: { type: DataTypes.STRING, defaultValue: 'Другое' },
  fileUrl: { type: DataTypes.STRING, allowNull: false },
  thumbUrl: { type: DataTypes.STRING },
  fileType: { type: DataTypes.STRING, defaultValue: 'other' },
  tags: { type: DataTypes.JSON, defaultValue: [] },
  downloadsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  likesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isFree: { type: DataTypes.BOOLEAN, defaultValue: true },
});

module.exports = Asset;
