const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const File = sequelize.define('File', {
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
  path: {
    type: DataTypes.STRING,
    allowNull: false, // relative path in project
  },
  storageKey: {
    type: DataTypes.STRING,
    allowNull: false, // S3 object key
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mimetype: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  checksum: {
    type: DataTypes.STRING,
    allowNull: false, // SHA256 for deduplication
  }
});

module.exports = File;
