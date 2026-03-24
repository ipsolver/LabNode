import { ZodError } from 'zod';
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

  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error', status: 500 });
}