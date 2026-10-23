import { z } from 'zod';

export const messageBody = z.object({ message: z.string().trim().min(2, 'Please enter a longer message').max(500) });
