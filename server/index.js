require('dotenv').config();
const path = require('path');            // ← обязательно
const express = require('express');
const cors = require('cors');
const app = express();

// middleware общего назначения
app.use(cors());
app.use(express.json());

// статические файлы (отдаём загруженные файлы по /uploads/...)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// маршруты API
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');

app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// подключение к БД
const sequelize = require('./db');
const User = require('./models/User');
const Project = require('./models/Project');

// синхронизация БД
sequelize.sync({ alter: true })
  .then(() => console.log('✅ DB synced'))
  .catch(console.error);

// тестовый маршрут
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// запуск сервера
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
