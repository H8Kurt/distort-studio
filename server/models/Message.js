const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Message = sequelize.define("Message", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  conversationId: { type: DataTypes.INTEGER, allowNull: false },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: true },
  replyToId: { type: DataTypes.INTEGER, allowNull: true },
  readAt: { type: DataTypes.DATE, allowNull: true },
  editedAt: { type: DataTypes.DATE, allowNull: true },
  attachmentUrl: { type: DataTypes.STRING, allowNull: true },
  attachmentType: {
    type: DataTypes.ENUM("image", "video", "audio", "file"),
    allowNull: true
  },
  attachmentName: { type: DataTypes.STRING, allowNull: true },
  attachmentMime: { type: DataTypes.STRING, allowNull: true },
  attachmentSize: { type: DataTypes.INTEGER, allowNull: true }
});

module.exports = Message;
