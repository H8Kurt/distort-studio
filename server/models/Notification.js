const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// type: follow | like | comment | collab_invite | project_update
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { type: DataTypes.INTEGER, allowNull: false }, // получатель
  actorId: DataTypes.INTEGER, // кто вызвал событие
  type: { type: DataTypes.STRING, allowNull: false },
  projectId: DataTypes.INTEGER,
  postId: DataTypes.INTEGER,
  commentId: DataTypes.INTEGER,
  message: DataTypes.STRING,
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = Notification;
