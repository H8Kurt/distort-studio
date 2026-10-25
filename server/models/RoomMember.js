const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const RoomMember = sequelize.define('RoomMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  roomId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  role: {
    type: DataTypes.ENUM('host', 'member'),
    defaultValue: 'member',
  },
});

module.exports = RoomMember;
