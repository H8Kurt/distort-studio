const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// Получить все проекты
router.get('/', async (req, res) => {
  const projects = await Project.findAll();
  res.json(projects);
});

// Добавить проект
router.post('/', async (req, res) => {
  try {
    const { title, description, UserId } = req.body;
    const newProject = await Project.create({ title, description, UserId });
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
