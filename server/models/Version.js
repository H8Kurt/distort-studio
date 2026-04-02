const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Version = sequelize.define('Version', {
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  parentVersionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING,
    defaultValue: 'Initial version',
  },
  storageManifest: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
});

module.exports = Version;
