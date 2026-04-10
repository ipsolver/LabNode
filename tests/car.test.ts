import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { CarModel } from '../src/models/car.model';
import { connectTestDB, disconnectTestDB, clearTestDB } from './setup';
import * as carStorage from '../src/storage/car';

describe('Cars API', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
    jest.restoreAllMocks();
  });

  const validCar = {
    name: 'BMW X5',
    brand: 'BMW',
    model: 'X5',
    year: 2020,
    price: 25000,
    transmission: 'automatic' as const,
    description: 'Good car',
  };

  describe('Car model', () => {
    it('creates valid document with timestamps and virtual field', async () => {
      const car = await CarModel.create(validCar);
      const json = car.toJSON();

      expect(car._id).toBeDefined();
      expect(car.createdAt).toBeInstanceOf(Date);
      expect(car.updatedAt).toBeInstanceOf(Date);
      expect(json).toHaveProperty('carLabel', 'BMW X5 (2020)');
    });

    it('fails validation for invalid brand', async () => {
      await expect(
        CarModel.create({
          ...validCar,
          brand: 'BMW123',
        })
      ).rejects.toThrow();
    });

    it('allows optional description', async () => {
      const { description, ...carWithoutDescription } = validCar;
      const car = await CarModel.create(carWithoutDescription);

      expect(car.description).toBeUndefined();
    });
  });

  describe('GET /api/cars', () => {
    it('returns empty paginated response', async () => {
      const res = await request(app).get('/api/cars');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1,
        },
      });
    });

    it('filters only by brand', async () => {
      await CarModel.create([
        validCar,
        {
          name: 'Audi A4',
          brand: 'Audi',
          model: 'A4',
          year: 2018,
          price: 18000,
          transmission: 'manual',
        },
      ]);

      const res = await request(app).get('/api/cars?brand=BMW');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].brand).toBe('BMW');
    });

    it('filters only by transmission', async () => {
      await CarModel.create([
        validCar,
        {
          name: 'Audi A4',
          brand: 'Audi',
          model: 'A4',
          year: 2018,
          price: 18000,
          transmission: 'manual',
        },
      ]);

      const res = await request(app).get('/api/cars?transmission=manual');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].transmission).toBe('manual');
    });

    it('filters by brand and transmission together', async () => {
      await CarModel.create([
        {
          name: 'BMW X5',
          brand: 'BMW',
          model: 'X5',
          year: 2020,
          price: 25000,
          transmission: 'automatic',
        },
        {
          name: 'BMW E46',
          brand: 'BMW',
          model: 'E46',
          year: 2004,
          price: 9000,
          transmission: 'manual',
        },
        {
          name: 'Audi A4',
          brand: 'Audi',
          model: 'A4',
          year: 2018,
          price: 18000,
          transmission: 'manual',
        },
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

    it('sorts by price ascending', async () => {
      await CarModel.create([
        { ...validCar, price: 30000 },
        {
          name: 'Audi A4',
          brand: 'Audi',
          model: 'A4',
          year: 2018,
          price: 15000,
          transmission: 'manual',
        },
      ]);

      const res = await request(app).get('/api/cars?sort=price');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].price).toBe(15000);
      expect(res.body.data[1].price).toBe(30000);
    });

    it('supports sorting descending and pagination', async () => {
      await CarModel.create([
        { ...validCar, price: 30000 },
        {
          name: 'Audi A4',
          brand: 'Audi',
          model: 'A4',
          year: 2018,
          price: 15000,
          transmission: 'manual',
        },
        {
          name: 'VW Golf',
          brand: 'Volkswagen',
          model: 'Golf',
          year: 2019,
          price: 20000,
          transmission: 'manual',
        },
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

    it('uses default page and limit for invalid values', async () => {
      await CarModel.create(validCar);

      const res = await request(app).get('/api/cars?page=0&limit=-1');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });
  });

  describe('GET /api/cars/modern', () => {
    it('returns only modern cars', async () => {
      await CarModel.create([
        validCar,
        {
          name: 'BMW E46',
          brand: 'BMW',
          model: 'E46',
          year: 2004,
          price: 9000,
          transmission: 'manual',
        },
      ]);

      const res = await request(app).get('/api/cars/modern');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        name: 'BMW X5',
        year: 2020,
      });
    });

    it('returns 500 when getModernCars throws unexpected error', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(carStorage, 'getModernCars').mockRejectedValueOnce(new Error('boom'));

        const res = await request(app).get('/api/cars/modern');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'Internal server error',
            status: 500,
        });
    });
  });

  describe('POST /api/cars', () => {
    it('creates car', async () => {
      const res = await request(app).post('/api/cars').send(validCar);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(validCar);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body).toHaveProperty('carLabel', 'BMW X5 (2020)');
    });

    it('creates car without optional description', async () => {
        const { description, ...carWithoutDescription } = validCar;

        const res = await request(app).post('/api/cars').send(carWithoutDescription);

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            name: validCar.name,
            brand: validCar.brand,
            model: validCar.model,
            year: validCar.year,
            price: validCar.price,
            transmission: validCar.transmission,
        });
        expect(res.body.description).toBeUndefined();
    });

    it('returns 400 for invalid payload', async () => {
      const res = await request(app).post('/api/cars').send({
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

    it('returns 409 for duplicate key error', async () => {
      await CarModel.collection.createIndex({ name: 1 }, { unique: true });

      const first = await request(app).post('/api/cars').send(validCar);
      const second = await request(app).post('/api/cars').send(validCar);

      expect(first.status).toBe(201);
      expect(second.status).toBe(409);
      expect(second.body).toMatchObject({
        message: 'Duplicate key error',
        keyValue: { name: 'BMW X5' },
      });
    });

    it('returns 500 when createCar throws unexpected error', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(carStorage, 'createCar').mockRejectedValueOnce(new Error('boom'));

        const res = await request(app).post('/api/cars').send(validCar);

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'Internal server error',
            status: 500,
        });
    });
  });

  describe('GET /api/cars/:id', () => {
    it('returns car by id', async () => {
      const car = await CarModel.create(validCar);

      const res = await request(app).get(`/api/cars/${car._id.toString()}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id', car._id.toString());
      expect(res.body.name).toBe(validCar.name);
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

  describe('PATCH /api/cars/:id', () => {
    it('updates car', async () => {
      const car = await CarModel.create(validCar);

      const res = await request(app)
        .patch(`/api/cars/${car._id.toString()}`)
        .send({ price: 22000 });

      expect(res.status).toBe(200);
      expect(res.body.price).toBe(22000);
      expect(res.body.brand).toBe(validCar.brand);
    });

    it('updates all optional fields and covers payload builder branches', async () => {
      const car = await CarModel.create(validCar);

      const res = await request(app)
        .patch(`/api/cars/${car._id.toString()}`)
        .send({
          name: 'Audi A6',
          brand: 'Audi',
          model: 'A6',
          year: 2021,
          transmission: 'manual',
          price: 31000,
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        name: 'Audi A6',
        brand: 'Audi',
        model: 'A6',
        year: 2021,
        transmission: 'manual',
        price: 31000,
        description: 'Updated description',
      });
    });

    it('returns 404 for missing valid ObjectId', async () => {
      const id = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/api/cars/${id}`)
        .send({ price: 20000 });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Car not found' });
    });

    it('returns 400 for invalid id format', async () => {
      const res = await request(app)
        .patch('/api/cars/invalid-id')
        .send({ price: 20000 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid _id' });
    });

    it('returns 400 for invalid update payload', async () => {
      const car = await CarModel.create(validCar);

      const res = await request(app)
        .patch(`/api/cars/${car._id.toString()}`)
        .send({ brand: 'BMW123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('DELETE /api/cars/:id', () => {
    it('deletes car', async () => {
      const car = await CarModel.create(validCar);

      const res = await request(app).delete(`/api/cars/${car._id.toString()}`);

      expect(res.status).toBe(204);

      const check = await request(app).get(`/api/cars/${car._id.toString()}`);
      expect(check.status).toBe(404);
    });

    it('returns 404 for missing valid ObjectId', async () => {
      const id = new mongoose.Types.ObjectId().toString();

      const res = await request(app).delete(`/api/cars/${id}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Car not found' });
    });

    it('returns 400 for invalid id format', async () => {
      const res = await request(app).delete('/api/cars/invalid-id');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Invalid _id' });
    });
  });

  describe('Unexpected errors', () => {
    it('returns 500 when getAllCars throws unexpected error', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(carStorage, 'getAllCars').mockRejectedValueOnce(new Error('boom'));

        const res = await request(app).get('/api/cars');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
            error: 'Internal server error',
            status: 500,
        });
    });
  });
});