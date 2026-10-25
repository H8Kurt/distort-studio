const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  coverUrl: { type: DataTypes.STRING },
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
  hostId: { type: DataTypes.INTEGER, allowNull: false },
  // Режим комнаты: музыка, совместный просмотр видео, канбан-доска, рисование
  mode: {
    type: DataTypes.ENUM('music', 'watch', 'board', 'draw'),
    defaultValue: 'music',
  },
  // Очередь треков (режим music)
  queue: { type: DataTypes.TEXT },
  // Состояние режима (JSON): watch {videoId,position}, board {columns,cards}, draw {image}
  data: { type: DataTypes.TEXT('medium') },
  lastActiveAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

module.exports = Room;
