const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const RoomMessage = sequelize.define('RoomMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  roomId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER },
  text: { type: DataTypes.TEXT },
  type: {
    type: DataTypes.ENUM('text', 'reaction', 'system'),
    defaultValue: 'text',
  },
});

module.exports = RoomMessage;
