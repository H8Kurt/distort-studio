const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Playlist = sequelize.define('Playlist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  coverUrl: { type: DataTypes.STRING },
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
});

module.exports = Playlist;
