import { z } from 'zod';

export const listProductsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  storeId: z.coerce.number().int().positive().optional(),
  category: z.string().trim().max(50).optional(),
  inStock: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const idParam = z.object({ id: z.coerce.number().int().positive() });
