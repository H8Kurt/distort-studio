const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AssetLike = sequelize.define('AssetLike', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  assetId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  indexes: [
    { unique: true, fields: ['userId', 'assetId'] }
  ]
});

module.exports = AssetLike;
