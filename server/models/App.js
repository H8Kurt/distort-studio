const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const App = sequelize.define('App', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: DataTypes.INTEGER,
  name: DataTypes.STRING,
  path: DataTypes.STRING,
  icon: DataTypes.STRING,
  lastUsed: DataTypes.DATE
});

module.exports = App;
