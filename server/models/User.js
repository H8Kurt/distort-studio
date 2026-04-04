const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false,
    unique: 'users_email_unique'
  },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'user' }, // admin или user
  bio: { type: DataTypes.TEXT, allowNull: true },
  avatarUrl: { type: DataTypes.STRING, allowNull: true },
  rebelRank: { type: DataTypes.INTEGER, defaultValue: 1 }
});

// Хэширование пароля перед сохранением
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});

module.exports = User;
