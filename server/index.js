require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// middleware
app.use(cors());
app.use(express.json());

// маршруты
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');

app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// отдаём файлы из папки uploads
app.use('/uploads', express.static('uploads'));

// подключение к базе
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
app.listen(4000, () => console.log('🚀 Server started on port 4000'));
