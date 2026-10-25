const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PostLike = sequelize.define('PostLike', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  postId: { type: DataTypes.INTEGER, allowNull: false }
}, {
  indexes: [
    { unique: true, fields: ['userId', 'postId'] }
  ]
});

module.exports = PostLike;
