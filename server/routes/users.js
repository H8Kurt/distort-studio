const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Получить всех пользователей
router.get('/', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

// Добавить пользователя
router.post('/', async (req, res) => {
  try {
    const { username, email } = req.body;
    const newUser = await User.create({ username, email });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// Удалить пользователя
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await User.destroy({ where: { id: req.params.id } });
    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
