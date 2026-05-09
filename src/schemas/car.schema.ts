import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const createCarSchema = z.object({
    name: z.string().min(1).max(100),
    brand: z.string().min(1).max(40),
    model: z.string().min(1).max(40).transform(s => s.trim()),
    year: z.number().int().min(1920).max(currentYear),
    transmission: z.enum(['manual', 'automatic']),
    price: z.number().positive(),
    description: z.string().max(500).optional(),
});

export const updateCarSchema = createCarSchema.partial();

export type CreateCarDTO = z.infer<typeof createCarSchema>;
export type UpdateCarDTO = z.infer<typeof updateCarSchema>;

export type Car = CreateCarDTO & {
  id: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};