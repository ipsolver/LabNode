import { Car, CreateCarDTO, UpdateCarDTO } from '../schemas/car.schema';
import { randomUUID } from 'crypto';

const cars = new Map<string, Car>();

type CarFilters = {
  brand?: string;
  transmission?: 'manual' | 'automatic';
};


export function getAllCars(filters?: CarFilters): Car[] {
  let result = Array.from(cars.values());

    if (filters?.brand) {
        result = result.filter((car) => car.brand.toLowerCase() === filters.brand!.toLowerCase());
    }

    if (filters?.transmission) {
        result = result.filter((car) => car.transmission === filters.transmission);
    }

    return result;
}

export function getModernCars(): Car[] {
    return Array.from(cars.values()).filter((car) => car.year >= 2015);
}

// export function getAllCars(): Car[] {
//   return Array.from(cars.values());
// }

export function getCarById(id: string): Car | undefined {
    return cars.get(id);
}

export function createCar(data: CreateCarDTO): Car {
    const now = new Date();

    const car: Car = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
    };

    cars.set(car.id, car);
    return car;
}

export function updateCar(id: string, data: UpdateCarDTO): Car | null {
    const myCar = cars.get(id);

    if (!myCar) {
        return null;
    }

    const cleanedData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)
        ) as Partial<CreateCarDTO>;

    const updatedCar: Car = {
        ...myCar,
        ...cleanedData,
        updatedAt: new Date(),
    };

    cars.set(id, updatedCar);
    return updatedCar;
}

export function deleteCar(id: string): boolean {
    return cars.delete(id);
}

export function clearAll(): void {
    cars.clear();
}