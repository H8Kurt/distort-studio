const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PostComment = sequelize.define('PostComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  postId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  parentId: DataTypes.INTEGER,
  content: { type: DataTypes.TEXT, allowNull: false }
});

module.exports = PostComment;
