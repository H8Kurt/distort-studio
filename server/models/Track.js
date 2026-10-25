const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Track = sequelize.define('Track', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: { type: DataTypes.STRING, allowNull: false },
  artist: { type: DataTypes.STRING },
  genre: { type: DataTypes.STRING, defaultValue: 'Другое' },
  url: { type: DataTypes.STRING, allowNull: false },
  thumbUrl: { type: DataTypes.STRING },
  duration: { type: DataTypes.FLOAT, defaultValue: 0 },
  plays: { type: DataTypes.INTEGER, defaultValue: 0 },
  likeCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  visibility: {
    type: DataTypes.ENUM('PRIVATE', 'PUBLIC', 'UNLISTED'),
    defaultValue: 'PUBLIC',
  },
});

module.exports = Track;
