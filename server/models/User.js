const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'user' },
  bio: { type: DataTypes.TEXT },
  avatarUrl: { type: DataTypes.STRING },
  rebelRank: { type: DataTypes.INTEGER, defaultValue: 1 },
  refreshToken: { type: DataTypes.STRING }
});

User.beforeCreate(async (user) => {
  user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
});

User.prototype.validatePassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = User;
