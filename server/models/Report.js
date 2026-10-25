const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// targetType: user | post | project | comment | message | asset
// status: open | reviewing | resolved | dismissed
const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reporterId: { type: DataTypes.INTEGER, allowNull: false },
  targetType: {
    type: DataTypes.ENUM('user', 'post', 'project', 'comment', 'message', 'asset'),
    allowNull: false
  },
  targetId: { type: DataTypes.INTEGER, allowNull: false },
  reason: { type: DataTypes.STRING, allowNull: false },
  details: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('open', 'reviewing', 'resolved', 'dismissed'),
    defaultValue: 'open'
  },
  resolvedById: { type: DataTypes.INTEGER, allowNull: true },
  resolvedAt: { type: DataTypes.DATE, allowNull: true },
  resolutionNote: { type: DataTypes.TEXT }
}, {
  indexes: [
    { fields: ['status'] },
    { fields: ['targetType', 'targetId'] }
  ]
});

module.exports = Report;
