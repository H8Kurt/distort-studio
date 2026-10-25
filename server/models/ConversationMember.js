const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// Участник диалога (и direct, и group).
const ConversationMember = sequelize.define("ConversationMember", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  conversationId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  role: {
    type: DataTypes.ENUM("owner", "admin", "member"),
    allowNull: false,
    defaultValue: "member"
  },
  lastReadAt: { type: DataTypes.DATE, allowNull: true },
  muted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  indexes: [
    { unique: true, fields: ["conversationId", "userId"] },
    { fields: ["userId"] }
  ]
});

module.exports = ConversationMember;
