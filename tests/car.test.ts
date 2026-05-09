import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { CarModel } from '../src/models/car.model';
import { connectTestDB, disconnectTestDB, clearTestDB } from './setup';

function getCookies(res: request.Response): string[] {
  const cookies = res.headers['set-cookie'];

  expect(cookies).toBeDefined();

  return Array.isArray(cookies) ? cookies : [cookies as string];
}

async function registerAndLogin(email: string): Promise<string[]> {
  await request(app)
    .post('/auth/register')
    .send({
      email,
      password: 'Password123',
    })
    .expect(201);

  const loginRes = await request(app)
    .post('/auth/login')
    .send({
      email,
      password: 'Password123',
    })
    .expect(200);

  return getCookies(loginRes);
}

function buildCar(overrides: Record<string, unknown> = {}) {
  return {
    name: 'BMW X5',
    brand: 'BMW',
    model: 'X5',
    year: 2020,
    price: 25000,
    transmission: 'automatic' as const,
    description: 'Good car',
    ownerId: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}

const validCarBody = {
  name: 'BMW X5',
  brand: 'BMW',
  model: 'X5',
  year: 2020,
  price: 25000,
  transmission: 'automatic' as const,
  description: 'Good car',
};

describe('Cars API', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  describe('Car model', () => {
    it('creates valid document with ownerId and timestamps', async () => {
      const car = await CarModel.create(buildCar());
      const json = car.toJSON();

      expect(car._id).toBeDefined();
      expect(car.ownerId).toBeDefined();
      expect(car.createdAt).toBeInstanceOf(Date);
      expect(car.updatedAt).toBeInstanceOf(Date);
      expect(json).toHaveProperty('carLabel', 'BMW X5 (2020)');
    });

    it('requires ownerId', async () => {
      const { ownerId, ...carWithoutOwner } = buildCar();

      await expect(CarModel.create(carWithoutOwner)).rejects.toThrow();
    });
  });

  describe('GET /api/cars', () => {
    it('returns paginated list of cars', async () => {
      await CarModel.create([
        buildCar(),
        buildCar({
          name: 'Audi A4',
          brand: 'Audi',
          model: 'A4',
          year: 2018,
          price: 18000,
          transmission: 'manual',
        }),
      ]);

      const res = await request(app).get('/api/cars');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('filters cars by brand and transmission', async () => {
      await CarModel.create([
        buildCar({
          brand: 'BMW',
          transmission: 'automatic',
        }),
        buildCar({
          name: 'BMW E46',
          brand: 'BMW',
          model: 'E46',
          year: 2004,
          price: 9000,
          transmission: 'manual',
        }),
        buildCar({
          name: 'Audi A4',
          brand: 'Audi',
          model: 'A4',
          year: 2018,
          price: 18000,
          transmission: 'manual',
        }),
      ]);

      const res = await request(app).get('/api/cars?brand=BMW&transmission=manual');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        brand: 'BMW',
        transmission: 'manual',
        model: 'E46',
      });
    });

    it('sorts cars by price descending and supports pagination', async () => {
      await CarModel.create([
        buildCar({ price: 30000 }),
        buildCar({
          name: 'Audi A4',
          brand: 'Audi',
          model: 'A4',
          year: 2018,
          price: 15000,
          transmission: 'manual',
        }),
        buildCar({
          name: 'VW Golf',
          brand: 'Volkswagen',
          model: 'Golf',
          year: 2019,
          price: 20000,
          transmission: 'manual',
        }),
      ]);

      const res = await request(app).get('/api/cars?sort=-price&page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].price).toBe(30000);
      expect(res.body.data[1].price).toBe(20000);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        pages: 2,
      });
    });
  });

  describe('GET /api/cars/modern', () => {
    it('returns only modern cars', async () => {
      await CarModel.create([
        buildCar(),
        buildCar({
          name: 'BMW E46',
          brand: 'BMW',
          model: 'E46',
          year: 2004,
          price: 9000,
          transmission: 'manual',
        }),
      ]);

      const res = await request(app).get('/api/cars/modern');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        name: 'BMW X5',
        year: 2020,
      });
    });
  });

  describe('GET /api/cars/:id', () => {
    it('returns car by id', async () => {
      const car = await CarModel.create(buildCar());

      const res = await request(app).get(`/api/cars/${car._id.toString()}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id', car._id.toString());
    });

    it('returns 404 for missing valid ObjectId', async () => {
      const id = new mongoose.Types.ObjectId().toString();

      const res = await request(app).get(`/api/cars/${id}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Car not found' });
    });

    it('returns 400 for invalid ObjectId format', async () => {
      const res = await request(app).get('/api/cars/invalid-id');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid _id' });
    });
  });

  describe('POST /api/cars', () => {
    it('returns 401 when creating car without authentication', async () => {
      const res = await request(app)
        .post('/api/cars')
        .send(validCarBody)
        .expect(401);

      expect(res.body).toHaveProperty('message');
    });

    it('creates car for authenticated user and sets ownerId', async () => {
      const cookies = await registerAndLogin('owner@example.com');

      const res = await request(app)
        .post('/api/cars')
        .set('Cookie', cookies)
        .send(validCarBody)
        .expect(201);

      expect(res.body).toMatchObject(validCarBody);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('ownerId');
      expect(res.body).toHaveProperty('carLabel', 'BMW X5 (2020)');
    });

    it('returns 400 for invalid payload when authenticated', async () => {
      const cookies = await registerAndLogin('owner@example.com');

      const res = await request(app)
        .post('/api/cars')
        .set('Cookie', cookies)
        .send({
          name: '',
          brand: 'BMW',
          model: 'X5',
          year: 1900,
          price: -1,
          transmission: 'robot',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('PATCH /api/cars/:id', () => {
    it('returns 401 when updating without authentication', async () => {
      const car = await CarModel.create(buildCar());

      const res = await request(app)
        .patch(`/api/cars/${car._id.toString()}`)
        .send({ price: 22000 })
        .expect(401);

      expect(res.body).toHaveProperty('message');
    });

    it('allows owner to update car', async () => {
      const cookies = await registerAndLogin('owner@example.com');

      const createRes = await request(app)
        .post('/api/cars')
        .set('Cookie', cookies)
        .send(validCarBody)
        .expect(201);

      const res = await request(app)
        .patch(`/api/cars/${createRes.body._id}`)
        .set('Cookie', cookies)
        .send({ price: 22000 })
        .expect(200);

      expect(res.body.price).toBe(22000);
    });

    it('returns 403 when another user tries to update car', async () => {
      const ownerCookies = await registerAndLogin('owner@example.com');
      const otherCookies = await registerAndLogin('other@example.com');

      const createRes = await request(app)
        .post('/api/cars')
        .set('Cookie', ownerCookies)
        .send(validCarBody)
        .expect(201);

      const res = await request(app)
        .patch(`/api/cars/${createRes.body._id}`)
        .set('Cookie', otherCookies)
        .send({ price: 22000 })
        .expect(403);

      expect(res.body).toHaveProperty('message');
    });

    it('returns 404 for missing valid ObjectId when authenticated', async () => {
      const cookies = await registerAndLogin('owner@example.com');
      const id = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/api/cars/${id}`)
        .set('Cookie', cookies)
        .send({ price: 20000 });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Car not found' });
    });

    it('returns 400 for invalid id format when authenticated', async () => {
      const cookies = await registerAndLogin('owner@example.com');

      const res = await request(app)
        .patch('/api/cars/invalid-id')
        .set('Cookie', cookies)
        .send({ price: 20000 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid _id' });
    });
  });

  describe('DELETE /api/cars/:id', () => {
    it('returns 401 when deleting without authentication', async () => {
      const car = await CarModel.create(buildCar());

      const res = await request(app)
        .delete(`/api/cars/${car._id.toString()}`)
        .expect(401);

      expect(res.body).toHaveProperty('message');
    });

    it('allows owner to delete car', async () => {
      const cookies = await registerAndLogin('owner@example.com');

      const createRes = await request(app)
        .post('/api/cars')
        .set('Cookie', cookies)
        .send(validCarBody)
        .expect(201);

      const res = await request(app)
        .delete(`/api/cars/${createRes.body._id}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(204);

      const check = await request(app).get(`/api/cars/${createRes.body._id}`);
      expect(check.status).toBe(404);
    });

    it('returns 403 when another user tries to delete car', async () => {
      const ownerCookies = await registerAndLogin('owner@example.com');
      const otherCookies = await registerAndLogin('other@example.com');

      const createRes = await request(app)
        .post('/api/cars')
        .set('Cookie', ownerCookies)
        .send(validCarBody)
        .expect(201);

      const res = await request(app)
        .delete(`/api/cars/${createRes.body._id}`)
        .set('Cookie', otherCookies)
        .expect(403);

      expect(res.body).toHaveProperty('message');

      const check = await request(app).get(`/api/cars/${createRes.body._id}`);
      expect(check.status).toBe(200);
    });

    it('returns 404 for missing valid ObjectId when authenticated', async () => {
      const cookies = await registerAndLogin('owner@example.com');
      const id = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/cars/${id}`)
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Car not found' });
    });

    it('returns 400 for invalid id format when authenticated', async () => {
      const cookies = await registerAndLogin('owner@example.com');

      const res = await request(app)
        .delete('/api/cars/invalid-id')
        .set('Cookie', cookies);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid _id' });
    });
  });
});