const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// ✅ Регистрация
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Пользователь уже существует' });

    const newUser = await User.create({ username, email, password });
    res.json({ message: 'Регистрация успешна', user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Неверная почта или пароль' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Неверная почта или пароль' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Успешный вход',
      token, // ← вот это ОЧЕНЬ важно
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// в server/routes/auth.js (уже должен быть require jwt, User и т.д.)
const auth = require('../middleware/auth'); // путь к твоему middleware

// получить инфо о текущем пользователе
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { 
      attributes: ['id','username','email','role','bio','avatarUrl','rebelRank','createdAt'] 
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
