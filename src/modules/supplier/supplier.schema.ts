import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
