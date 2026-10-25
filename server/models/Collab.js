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
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'declined'),
    defaultValue: 'accepted',
  },
  invitedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Collab;
