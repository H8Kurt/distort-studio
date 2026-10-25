const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PlaylistTrack = sequelize.define('PlaylistTrack', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  position: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = PlaylistTrack;
