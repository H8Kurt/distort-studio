const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// status: pending | accepted | declined
const Friendship = sequelize.define("Friendship", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  requesterId: { type: DataTypes.INTEGER, allowNull: false },
  addresseeId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM("pending", "accepted", "declined"),
    allowNull: false,
    defaultValue: "pending",
  },
});

module.exports = Friendship;
