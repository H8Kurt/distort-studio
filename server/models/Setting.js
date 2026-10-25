const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// Настройки сайта: key/value (value хранится как JSON-строка)
const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  value: { type: DataTypes.TEXT }
});

module.exports = Setting;
