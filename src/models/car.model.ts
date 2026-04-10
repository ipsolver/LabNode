import { Schema, model, HydratedDocument } from 'mongoose';

const currentYear = new Date().getFullYear();

export interface Car {
  name: string;
  brand: string;
  model: string;
  year: number;
  transmission: 'manual' | 'automatic';
  price: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CarDocument = HydratedDocument<Car>;

const carSchema = new Schema<Car>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 character long'],
      maxlength: [100, 'Name must be at most 100 characters long'],
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
      minlength: [1, 'Brand must be at least 1 character long'],
      maxlength: [40, 'Brand must be at most 40 characters long'],
      validate: {
        validator: (value: string) => /^[A-Za-z\s-]+$/.test(value),
        message: 'Brand may contain only letters, spaces, and hyphens',
      },
    },
    model: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
      minlength: [1, 'Model must be at least 1 character long'],
      maxlength: [40, 'Model must be at most 40 characters long'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1920, 'Year must be greater than or equal to 1920'],
      max: [currentYear, `Year must be less than or equal to ${currentYear}`],
      validate: {
        validator: Number.isInteger,
        message: 'Year must be an integer',
      },
    },
    transmission: {
      type: String,
      required: [true, 'Transmission is required'],
      enum: {
        values: ['manual', 'automatic'],
        message: 'Transmission must be either manual or automatic',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be greater than 0'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be at most 500 characters long'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

carSchema.virtual('carLabel').get(function () {
  return `${this.brand} ${this.model} (${this.year})`;
});

export const CarModel = model<Car>('Car', carSchema);