const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  versionId: { type: DataTypes.INTEGER },
  path: DataTypes.STRING,
  storageKey: DataTypes.STRING,
  size: DataTypes.INTEGER,
  mimetype: DataTypes.STRING,
  checksum: DataTypes.STRING
});

module.exports = File;
