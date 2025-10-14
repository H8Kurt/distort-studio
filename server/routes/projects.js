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
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Project.destroy({ where: { id: req.params.id } });
    res.json({ deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Обновить проект
router.put('/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    const updated = await Project.update(
      { title, description },
      { where: { id: req.params.id } }
    );
    res.json({ updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
