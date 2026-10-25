const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// Диалог: direct (1:1) или group (групповой чат).
// Для direct userAId всегда меньше userBId, чтобы пара была уникальной.
// Для group userAId/userBId = null, участники хранятся в ConversationMember.
const Conversation = sequelize.define("Conversation", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM("direct", "group"),
    allowNull: false,
    defaultValue: "direct"
  },
  title: { type: DataTypes.STRING(120), allowNull: true },
  avatarUrl: { type: DataTypes.STRING, allowNull: true },
  ownerId: { type: DataTypes.INTEGER, allowNull: true },
  userAId: { type: DataTypes.INTEGER, allowNull: true },
  userBId: { type: DataTypes.INTEGER, allowNull: true },
  lastMessageAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  lastMessagePreview: { type: DataTypes.STRING(300) }
});

Conversation.ensurePair = (a, b) => {
  const aId = Number(a);
  const bId = Number(b);
  return aId < bId ? { userAId: aId, userBId: bId } : { userAId: bId, userBId: aId };
};

module.exports = Conversation;
