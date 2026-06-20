import { z } from 'zod';

export const createMovementSchema = z.object({
  productId: z.string().uuid('A valid product is required'),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce
    .number()
    .int('Quantity must be a whole number')
    .refine((n) => n !== 0, 'Quantity cannot be zero'),
  note: z.string().max(500).optional().nullable(),
});

export const listMovementQuerySchema = z.object({
  productId: z.string().optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type ListMovementQuery = z.infer<typeof listMovementQuerySchema>;
