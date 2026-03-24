import { createCarSchema, updateCarSchema } from '../schemas/car.schema';
import { Router, Request, Response } from 'express';
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
};

// router.get('/', (req: Request, res: Response) => {
//     const cars = getAllCars();
//     res.status(200).json(cars);
// });

router.get('/', (req: Request<{}, {}, {}, CarQuery>, res: Response) => {
    const {brand, transmission} = req.query;
    const filters: CarQuery = {};

    if (brand !== undefined) {
        filters.brand = brand;
    }

    if (transmission !== undefined) {
        filters.transmission = transmission;
    }

    const cars = getAllCars(filters);
    res.status(200).json(cars);
});


router.get('/modern', (req: Request, res: Response) => {
    const cars = getModernCars();
    res.status(200).json(cars);
});

router.get('/:id', (req: Request<IdParam>, res: Response) => {
    const car = getCarById(req.params.id);

    if (!car) {
        res.status(404).json({
            message: 'Car not found',
        });
        return;
    }

    res.status(200).json(car);
});


router.post('/', validate(createCarSchema), (req: Request, res: Response) => {
    const newCar = createCar(req.body);
    res.status(201).json(newCar);
});

router.patch('/:id', validate(updateCarSchema), (req: Request<IdParam>, res: Response) => {
    const updatedCar = updateCar(req.params.id, req.body);

    if (!updatedCar) {
        res.status(404).json({
            message: 'Car not found',
        });
        return;
    }

    res.status(200).json(updatedCar);
});

router.delete('/:id', (req: Request<IdParam>, res: Response) => {
  const deleted = deleteCar(req.params.id);

    if (!deleted) {
        res.status(404).json({
            message: 'Car not found',
        });
        return;
    }

    res.status(204).send();
});

export default router;