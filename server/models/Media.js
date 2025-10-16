const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User'); // опционально
const Project = require('./Project'); // опционально

const Media = sequelize.define('Media', {
  filename: { type: DataTypes.STRING, allowNull: false },
  originalName: { type: DataTypes.STRING },
  mime: { type: DataTypes.STRING },
  size: { type: DataTypes.INTEGER },
  url: { type: DataTypes.STRING },   // путь /uploads/...
  thumbUrl: { type: DataTypes.STRING }, // для изображений
  type: { type: DataTypes.STRING },  // image | audio | other
});

User.hasMany(Media);
Media.belongsTo(User);

Project.hasMany(Media);
Media.belongsTo(Project);

module.exports = Media;
