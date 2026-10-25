const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const TrackLike = sequelize.define('TrackLike', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
});

module.exports = TrackLike;
