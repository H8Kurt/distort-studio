const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Collab = sequelize.define('Collab', {
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'viewer', // viewer, editor, owner
  },
});

module.exports = Collab;
