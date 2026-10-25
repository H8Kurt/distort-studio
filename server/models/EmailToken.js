const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// Одноразовые токены для подтверждения почты и сброса пароля.
// В БД хранится только sha256-хэш токена, сам токен уходит пользователю письмом.
const EmailToken = sequelize.define(
  "EmailToken",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    type: {
      type: DataTypes.ENUM("verify", "reset"),
      allowNull: false,
    },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ["tokenHash"] },
      { fields: ["userId", "type"] },
    ],
  }
);

module.exports = EmailToken;
