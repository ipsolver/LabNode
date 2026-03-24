import request from 'supertest';
import app from '../src/app';
import { clearAll } from '../src/storage/car';

describe('Cars API', () => {
    beforeEach(() => {
        clearAll();
    });

    const validCar = {
        name: 'BMW X5',
        brand: 'BMW',
        model: 'X5',
        year: 2020,
        price: 25000,
        transmission: 'automatic',
        description: 'Good car',
    };

  describe('GET /api/cars', () => {
    it('should return empty array when there are no cars', async () => {
        const res = await request(app).get('/api/cars');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('should return all cars', async () => {
        await request(app).post('/api/cars').send(validCar);

        const res = await request(app).get('/api/cars');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({
            name: validCar.name,
            brand: validCar.brand,
            model: validCar.model,
        });
    });
  });

  describe('Filtering and custom route', () => {
    const car1 = {
        name: 'BMW X5',
        brand: 'BMW',
        model: 'X5',
        year: 2020,
        price: 25000,
        transmission: 'automatic' as const,
        description: 'Modern BMW',
    };

    const car2 = {
        name: 'Audi A4',
        brand: 'Audi',
        model: 'A4',
        year: 2012,
        price: 15000,
        transmission: 'manual' as const,
        description: 'Older Audi',
    };

    const car3 = {
        name: 'BMW E46',
        brand: 'BMW',
        model: 'E46',
        year: 2004,
        price: 9000,
        transmission: 'manual' as const,
        description: 'Classic BMW',
    };

    beforeEach(async () => {
        await request(app).post('/api/cars').send(car1);
        await request(app).post('/api/cars').send(car2);
        await request(app).post('/api/cars').send(car3);
    });

    it('should filter cars by brand', async () => {
    const res = await request(app).get('/api/cars?brand=BMW');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((car: any) => car.brand === 'BMW')).toBe(true);
    });

    it('should filter cars by transmission', async () => {
    const res = await request(app).get('/api/cars?transmission=manual');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((car: any) => car.transmission === 'manual')).toBe(true);
    });

    it('should filter cars by brand and transmission together', async () => {
    const res = await request(app).get('/api/cars?brand=BMW&transmission=manual');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
        brand: 'BMW',
        transmission: 'manual',
        model: 'E46',
    });
    });

    it('should return modern cars only', async () => {
    const res = await request(app).get('/api/cars/modern');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
        name: 'BMW X5',
        year: 2020,
    });
    });
});

  describe('POST /api/cars', () => {
    it('should create a car', async () => {
        const res = await request(app).post('/api/cars').send(validCar);

        expect(res.status).toBe(201);
        expect(res.headers['content-type']).toMatch(/json/);
        expect(res.body).toMatchObject(validCar);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('createdAt');
        expect(res.body).toHaveProperty('updatedAt');
    });

    it('should return 400 for invalid car data', async () => {
        const invalidCar = {
            name: '',
            brand: 'BMW',
            model: 'X5',
            year: 1910,
            price: -100,
            transmission: 'robot',
        };

        const res = await request(app).post('/api/cars').send(invalidCar);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('should return 400 when required fields are missing', async () => {
        const res = await request(app).post('/api/cars').send({
            brand: 'BMW',
        });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/cars/:id', () => {
    it('should return a car by id', async () => {
        const createRes = await request(app).post('/api/cars').send(validCar);
        const carId = createRes.body.id;

        const res = await request(app).get(`/api/cars/${carId}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', carId);
        expect(res.body).toMatchObject(validCar);
    });

    it('should return 404 if car is not found', async () => {
        const res = await request(app).get('/api/cars/non-existent-id');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            message: 'Car not found',
        });
    });
  });

  describe('PATCH /api/cars/:id', () => {
    it('should update a car', async () => {
        const createRes = await request(app).post('/api/cars').send(validCar);
        const carId = createRes.body.id;

        const patchRes = await request(app)
        .patch(`/api/cars/${carId}`)
        .send({ price: 22000 });

        expect(patchRes.status).toBe(200);
        expect(patchRes.body).toHaveProperty('id', carId);
        expect(patchRes.body).toHaveProperty('price', 22000);
        expect(patchRes.body).toHaveProperty('brand', validCar.brand);
        expect(patchRes.body).toHaveProperty('model', validCar.model);
    });

    it('should return 404 when updating non-existing car', async () => {
        const res = await request(app)
        .patch('/api/cars/non-existent-id')
        .send({ price: 20000 });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            message: 'Car not found',
        });
    });

    it('should return 400 for invalid update data', async () => {
        const createRes = await request(app).post('/api/cars').send(validCar);
        const carId = createRes.body.id;

        const res = await request(app)
        .patch(`/api/cars/${carId}`)
        .send({ year: 1900 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('should allow partial update', async () => {
        const createRes = await request(app).post('/api/cars').send(validCar);
        const carId = createRes.body.id;

        const res = await request(app)
        .patch(`/api/cars/${carId}`)
        .send({ transmission: 'manual' });

        expect(res.status).toBe(200);
        expect(res.body.transmission).toBe('manual');
        expect(res.body.brand).toBe(validCar.brand);
        expect(res.body.name).toBe(validCar.name);
    });
  });

  describe('DELETE /api/cars/:id', () => {
    it('should delete a car', async () => {
        const createRes = await request(app).post('/api/cars').send(validCar);
        const carId = createRes.body.id;

        const deleteRes = await request(app).delete(`/api/cars/${carId}`);

        expect(deleteRes.status).toBe(204);
        expect(deleteRes.text).toBe('');

        const getRes = await request(app).get(`/api/cars/${carId}`);
        expect(getRes.status).toBe(404);
    });

    it('should return 404 when deleting non-existing car', async () => {
        const res = await request(app).delete('/api/cars/non-existent-id');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            message: 'Car not found',
        });
    });
  });
});