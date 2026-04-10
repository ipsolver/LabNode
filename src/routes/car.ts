import { createCarSchema, updateCarSchema } from '../schemas/car.schema';
import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import {
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
  getModernCars,
} from '../storage/car';

const router = Router();

type IdParam = {
  id: string;
};

type CarQuery = {
  brand?: string;
  transmission?: 'manual' | 'automatic';
  sort?: string;
  page?: string;
  limit?: string;
};

router.get('/', async (req: Request<{}, {}, {}, CarQuery>, res: Response, next: NextFunction) => {
    try {
      const { brand, transmission, sort, page, limit } = req.query;

      const filters: {
        brand?: string;
        transmission?: 'manual' | 'automatic';
      } = {};

      if(brand !== undefined) {
        filters.brand = brand;
      }

      if(transmission !== undefined) {
        filters.transmission = transmission;
      }

      const options: {
        filters?: {
          brand?: string;
          transmission?: 'manual' | 'automatic';
        };
        sort?: string;
        page?: number;
        limit?: number;
      } = {};

      if(Object.keys(filters).length > 0) {
        options.filters = filters;
      }

      if(sort !== undefined) {
        options.sort = sort;
      }

      if(page !== undefined) {
        options.page = Number(page);
      }

      if(limit !== undefined) {
        options.limit = Number(limit);
      }

      const result = await getAllCars(options);
      res.status(200).json(result);
    } catch(error) {
      next(error);
    }
  }
);

router.get('/modern', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const cars = await getModernCars();
      res.status(200).json(cars);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', async (req: Request<IdParam>, res: Response, next: NextFunction) => {
    try {
      const car = await getCarById(req.params.id);

      if(!car) {
        res.status(404).json({
          message: 'Car not found',
        });
        return;
      }

      res.status(200).json(car);
    } catch(error) {
      next(error);
    }
  }
);

router.post('/', validate(createCarSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newCar = await createCar(req.body);
      res.status(201).json(newCar);
    } catch(error) {
      next(error);
    }
  }
);

router.patch('/:id', validate(updateCarSchema), async (req: Request<IdParam>, res: Response, next: NextFunction) => {
    try {
      const updatedCar = await updateCar(req.params.id, req.body);

      if(!updatedCar) {
        res.status(404).json({
            message: 'Car not found',
        });
        return;
      }

      res.status(200).json(updatedCar);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id', async (req: Request<IdParam>, res: Response, next: NextFunction) => {
    try {
      const deleted = await deleteCar(req.params.id);

      if(!deleted) {
        res.status(404).json({
            message: 'Car not found',
        });
        return;
      }

    res.status(204).send();
    } catch(error) {
      next(error);
    }
  }
);

export default router;