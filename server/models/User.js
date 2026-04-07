const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: { type: DataTypes.STRING, allowNull: false },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false,
    unique: 'users_email_unique'
  },
  passwordHash: { type: DataTypes.STRING, allowNull: false, field: 'password' },
  role: { type: DataTypes.STRING, defaultValue: 'user' }, // admin или user
  bio: { type: DataTypes.TEXT, allowNull: true },
  avatarUrl: { type: DataTypes.STRING, allowNull: true },
  rebelRank: { type: DataTypes.INTEGER, defaultValue: 1 },
  refreshToken: { type: DataTypes.STRING, allowNull: true }
});

// Хэширование пароля перед сохранением
User.beforeCreate(async (user) => {
  if (user.passwordHash) {
    user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
  }
});

// Метод для проверки пароля
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = User;
