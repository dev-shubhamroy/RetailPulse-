import { z } from 'zod';

export const createProposalBody = z.object({
  productId: z.coerce.number().int().positive(),
  action: z.enum(['increase', 'decrease']),
  quantity: z.coerce.number().int().min(1).max(10000),
  reason: z.string().trim().min(3, 'Please give a reason').max(300),
  proposedBy: z.string().trim().min(1).max(60).default('store-staff'),
});

export const decisionBody = z.object({
  note: z.string().trim().max(300).optional(),
  decidedBy: z.string().trim().min(1).max(60).default('demo-manager'),
});

export const listProposalsQuery = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'failed']).optional(),
});
