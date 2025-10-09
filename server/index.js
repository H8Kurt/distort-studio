const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.listen(4000, () => console.log('Server started on port 4000'));
