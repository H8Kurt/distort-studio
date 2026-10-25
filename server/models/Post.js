const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// Пост в ленте — «сообщение от человека», опционально привязан к проекту
const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  projectId: DataTypes.INTEGER,
  imageUrl: DataTypes.STRING,
  thumbUrl: DataTypes.STRING,
  imageWidth: DataTypes.INTEGER,
  imageHeight: DataTypes.INTEGER,
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = Post;
