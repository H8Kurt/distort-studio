const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: DataTypes.INTEGER,
  versionId: DataTypes.INTEGER,
  userId: DataTypes.INTEGER,
  parentId: DataTypes.INTEGER,
  content: DataTypes.TEXT
});

module.exports = Comment;
