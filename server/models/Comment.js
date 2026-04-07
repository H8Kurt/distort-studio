const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  versionId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  }
});

// Self-referential relation for threaded comments
Comment.associate = (models) => {
  Comment.belongsTo(Comment, { as: 'parent', foreignKey: 'parentId' });
  Comment.hasMany(Comment, { as: 'replies', foreignKey: 'parentId' });
};

module.exports = Comment;
