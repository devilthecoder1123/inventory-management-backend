import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(64),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().max(1000).optional().nullable(),
  price: z.coerce.number().min(0, 'Price cannot be negative').default(0),
  costPrice: z.coerce.number().min(0, 'Cost price cannot be negative').default(0),
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative').default(0),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  categoryId: z.string().uuid().optional().nullable().or(z.literal('')),
  supplierId: z.string().uuid().optional().nullable().or(z.literal('')),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sortBy: z.enum(['name', 'sku', 'price', 'quantity', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductQuery = z.infer<typeof listProductQuerySchema>;
