import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { MongoServerError } from 'mongodb';
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      errors: err.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      message: `Invalid ${err.path}`,
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      errors: Object.values(err.errors).map((error) => ({
        field: error.path,
        message: error.message,
      })),
    });
  }

  if (err instanceof MongoServerError && err.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate key error',
      keyValue: err.keyValue,
    });
  }

  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error', status: 500 });
}