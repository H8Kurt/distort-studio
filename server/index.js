const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// маршруты
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);

// подключение к БД
const sequelize = require('./db');
const User = require('./models/User');
const Project = require('./models/Project');

// Синхронизация базы
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ DB synced');
    app.listen(4000, () => console.log('🚀 Server started on port 4000'));
  })
  .catch((err) => console.error('❌ DB error:', err));

// тестовый маршрут
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});
