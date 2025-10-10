// server/index.js
require('dotenv').config(); // <-- грузим .env в process.env

const express = require('express');
const { Sequelize } = require('sequelize');

const app = express();
app.use(express.json());
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);


// создаём подключение Sequelize, берём параметры из .env
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false, // отключает вывод SQL запросов в консоль (можно true для отладки)
  }
);

// проверка подключения к БД
sequelize.authenticate()
  .then(() => console.log('DB connected'))
  .catch(err => console.error('DB connection error:', err));

// Простой API для проверки
app.get('/api/ping', (req, res) => res.json({ message: 'pong' }));

// Доп. маршрут, который проверяет выполнение тестового запроса к БД
app.get('/api/dbinfo', async (req, res) => {
  try {
    const [results] = await sequelize.query('SELECT 1+1 AS result');
    res.json({ db: 'ok', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
