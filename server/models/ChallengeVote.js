const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ChallengeVote = sequelize.define(
  'ChallengeVote',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    entryId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    indexes: [{ unique: true, fields: ['entryId', 'userId'] }],
  }
);

module.exports = ChallengeVote;
