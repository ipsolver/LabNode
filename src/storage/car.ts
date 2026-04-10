import { CarModel } from '../models/car.model';
import { CreateCarDTO, UpdateCarDTO } from '../schemas/car.schema';

type CarFilters = {
  brand?: string;
  transmission?: 'manual' | 'automatic';
};

type GetAllCarsOptions = {
  filters?: CarFilters;
  sort?: string;
  page?: number;
  limit?: number;
};

function buildCreatePayload(data: CreateCarDTO) {
  const payload: {
    name: string;
    brand: string;
    model: string;
    year: number;
    transmission: 'manual' | 'automatic';
    price: number;
    description?: string;
  } = {
    name: data.name,
    brand: data.brand,
    model: data.model,
    year: data.year,
    transmission: data.transmission,
    price: data.price,
  };

  if (data.description !== undefined) {
    payload.description = data.description;
  }

  return payload;
}

function buildUpdatePayload(data: UpdateCarDTO) {
  const payload: {
    name?: string;
    brand?: string;
    model?: string;
    year?: number;
    transmission?: 'manual' | 'automatic';
    price?: number;
    description?: string;
  } = {};

  if (data.name !== undefined) {
    payload.name = data.name;
  }

  if (data.brand !== undefined) {
    payload.brand = data.brand;
  }

  if (data.model !== undefined) {
    payload.model = data.model;
  }

  if (data.year !== undefined) {
    payload.year = data.year;
  }

  if (data.transmission !== undefined) {
    payload.transmission = data.transmission;
  }

  if (data.price !== undefined) {
    payload.price = data.price;
  }

  if (data.description !== undefined) {
    payload.description = data.description;
  }

  return payload;
}

export async function getAllCars(options?: GetAllCarsOptions) {
  const sort = options?.sort ?? 'createdAt';
  const page = options?.page && options.page > 0 ? options.page : 1;
  const limit = options?.limit && options.limit > 0 ? options.limit : 10;

  const query: {
    brand?: RegExp;
    transmission?: 'manual' | 'automatic';
  } = {};

  if (options?.filters?.brand) {
    query.brand = new RegExp(`^${options.filters.brand}$`, 'i');
  }

  if (options?.filters?.transmission) {
    query.transmission = options.filters.transmission;
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    CarModel.find(query).sort(sort).skip(skip).limit(limit).lean({ virtuals: true }),
    CarModel.countDocuments(query),
  ]);

  const pages = Math.ceil(total / limit) || 1;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}

export async function getModernCars() {
  return CarModel.find({
    year: { $gte: 2015 },
  }).lean({ virtuals: true });
}

export async function getCarById(id: string) {
  return CarModel.findById(id).lean({ virtuals: true });
}

export async function createCar(data: CreateCarDTO) {
  const payload = buildCreatePayload(data);
  const createdCar = new CarModel(payload);
  const savedCar = await createdCar.save();
  return savedCar.toObject();
}

export async function updateCar(id: string, data: UpdateCarDTO) {
  const payload = buildUpdatePayload(data);

  const updatedCar = await CarModel.findByIdAndUpdate(id, payload, {
    returnDocument: 'after',
    runValidators: true,
  });

  return updatedCar ? updatedCar.toObject() : null;
}

export async function deleteCar(id: string) {
  const deletedCar = await CarModel.findByIdAndDelete(id);
  return !!deletedCar;
}