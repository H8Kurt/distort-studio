const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const { appSchema, appUpdateSchema } = require('../lib/validators');
const { discoverApps } = require('../lib/appDiscover');
const App = require('../models/App');

function toPublic(appModel) {
  const json = typeof appModel.toJSON === 'function' ? appModel.toJSON() : { ...appModel };
  return json;
}

// GET /api/apps — приложения пользователя
router.get('/', auth, async (req, res, next) => {
  try {
    const apps = await App.findAll({
      where: { userId: req.user.id },
      order: [
        ['lastUsed', 'DESC'],
        ['name', 'ASC'],
      ],
    });
    res.json(apps.map(toPublic));
  } catch (err) {
    next(err);
  }
});

// GET /api/apps/discover — найденные в системе приложения
router.get('/discover', auth, async (req, res, next) => {
  try {
    res.json(discoverApps());
  } catch (err) {
    next(err);
  }
});

// POST /api/apps — добавить приложение
router.post('/', auth, async (req, res, next) => {
  try {
    const data = appSchema.parse(req.body);
    const appModel = await App.create({
      userId: req.user.id,
      name: data.name,
      path: data.path,
      args: data.args || null,
      icon: data.icon || null,
      projectId: data.projectId ?? null,
      watchFolder: data.watchFolder || null,
      autoSession: data.autoSession ?? true,
      autoImport: data.autoImport ?? false,
    });
    res.status(201).json(toPublic(appModel));
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    next(err);
  }
});

// PUT /api/apps/:id — изменить приложение
router.put('/:id', auth, async (req, res, next) => {
  try {
    const appModel = await App.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!appModel) return res.status(404).json({ error: 'Приложение не найдено' });

    const data = appUpdateSchema.parse(req.body);
    if (data.name !== undefined) appModel.name = data.name;
    if (data.path !== undefined) appModel.path = data.path;
    if (data.args !== undefined) appModel.args = data.args || null;
    if (data.icon !== undefined) appModel.icon = data.icon || null;
    if (data.projectId !== undefined) appModel.projectId = data.projectId ?? null;
    if (data.watchFolder !== undefined) appModel.watchFolder = data.watchFolder || null;
    if (data.autoSession !== undefined) appModel.autoSession = data.autoSession;
    if (data.autoImport !== undefined) appModel.autoImport = data.autoImport;
    await appModel.save();

    res.json(toPublic(appModel));
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
    }
    next(err);
  }
});

// POST /api/apps/:id/launch — отметить запуск (обновляет lastUsed)
router.post('/:id/launch', auth, async (req, res, next) => {
  try {
    const appModel = await App.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!appModel) return res.status(404).json({ error: 'Приложение не найдено' });
    appModel.lastUsed = new Date();
    await appModel.save();
    res.json(toPublic(appModel));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/apps/:id — удалить приложение
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const deleted = await App.destroy({ where: { id: req.params.id, userId: req.user.id } });
    if (!deleted) return res.status(404).json({ error: 'Приложение не найдено' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
