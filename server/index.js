const express = require('express');
const cors = require('cors'); // <--- вот эту строку обязательно добавь
const app = express();

app.use(cors()); // разрешаем запросы с фронтенда
app.use(express.json());

// маршруты
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// подключение к БД
const sequelize = require('./db');
const User = require('./models/User');

sequelize.sync({ alter: true })
  .then(() => console.log('✅ DB synced'))
  .catch(console.error);

// тестовый маршрут
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// запуск сервера
app.listen(4000, () => console.log('🚀 Server started on port 4000'));
