const request = require('supertest');
const app = require('../app');
const sequelize = require('../db');

describe('Auth routes', () => {
  const email = `jest_${Date.now()}@example.com`;
  const password = 'Passw0rd123';
  let token;

  afterAll(async () => {
    await sequelize.close();
  });

  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'Jest User', email, password });

    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    token = res.body.token;
  });

  it('rejects registration with a weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'Weak', email: `weak_${Date.now()}@example.com`, password: '123' });

    expect(res.statusCode).toBe(400);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass123' });

    expect(res.statusCode).toBe(400);
  });

  it('returns the current user for a valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});
