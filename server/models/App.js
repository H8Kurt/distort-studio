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
  args: DataTypes.STRING,
  icon: DataTypes.STRING,
  lastUsed: DataTypes.DATE,
  // Связанный проект: куда пишется автосессия и куда импортируются файлы.
  projectId: DataTypes.INTEGER,
  // Папка, за которой следит десктоп-приложение для автоимпорта.
  watchFolder: DataTypes.STRING,
  autoSession: { type: DataTypes.BOOLEAN, defaultValue: true },
  autoImport: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = App;
