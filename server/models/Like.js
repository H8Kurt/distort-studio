const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  projectId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  indexes: [
    { unique: true, fields: ['userId', 'projectId'] }
  ]
});

module.exports = Like;
