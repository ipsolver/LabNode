import request from 'supertest';
import app from '../src/app';
import { connectTestDB, disconnectTestDB, clearTestDB } from './setup';

function getCookies(res: request.Response): string[] {
  const cookies = res.headers['set-cookie'];

  expect(cookies).toBeDefined();

  return Array.isArray(cookies) ? cookies : [cookies as string];
}

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Auth API', () => {
  it('registers a new user without returning password hash', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(201);

    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('validates registration payload', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'invalid-email',
        password: '123',
      })
      .expect(400);

    expect(res.body).toHaveProperty('errors');
  });

  it('does not allow duplicate email registration', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(201);

    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(409);

    expect(res.body).toHaveProperty('message');
  });

  it('logs in and sets httpOnly cookies', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(201);

    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(200);

    const cookies = getCookies(res);
    const cookieHeader = cookies.join(';');

    expect(cookieHeader).toContain('access_token');
    expect(cookieHeader).toContain('refresh_token');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('Secure');
    expect(cookieHeader).toContain('SameSite=Strict');

    expect(res.body.access_token).toBeUndefined();
    expect(res.body.refresh_token).toBeUndefined();
  });

  it('rejects login with invalid password', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(201);

    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword',
      })
      .expect(401);

    expect(res.body).toHaveProperty('message');
  });

  it('rejects login for non-existing user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'missing@example.com',
        password: 'Password123',
      })
      .expect(401);

    expect(res.body).toHaveProperty('message');
  });

  it('refreshes tokens using refresh cookie', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(201);

    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123',
      })
      .expect(200);

    const cookies = getCookies(loginRes);

    const refreshRes = await request(app)
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);

    const refreshedCookies = getCookies(refreshRes);
    const cookieHeader = refreshedCookies.join(';');

    expect(cookieHeader).toContain('access_token');
    expect(cookieHeader).toContain('refresh_token');
  });

  it('rejects refresh without refresh token', async () => {
    await request(app)
      .post('/auth/refresh')
      .expect(401);
  });

  it('clears cookies on logout', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .expect(200);

    const cookies = getCookies(res);
    const cookieHeader = cookies.join(';');

    expect(cookieHeader).toContain('access_token=');
    expect(cookieHeader).toContain('refresh_token=');
  });
});