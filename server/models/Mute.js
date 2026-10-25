const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// userId замьютил mutedUserId: контент прячется из ленты, но чат разрешён
const Mute = sequelize.define('Mute', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  mutedUserId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  indexes: [
    { unique: true, fields: ['userId', 'mutedUserId'] }
  ]
});

module.exports = Mute;
