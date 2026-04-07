const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const App = sequelize.define('App', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false, // executable path
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastUsed: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

module.exports = App;
