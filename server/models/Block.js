const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// blockerId заблокировал blockedId: скрывает контент друг друга и запрещает чат
const Block = sequelize.define('Block', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  blockerId: { type: DataTypes.INTEGER, allowNull: false },
  blockedId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  indexes: [
    { unique: true, fields: ['blockerId', 'blockedId'] }
  ]
});

module.exports = Block;
