import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_USER: z.string().default('retailpulse'),
  POSTGRES_PASSWORD: z.string().default('retailpulse_dev_password'),
  POSTGRES_DB: z.string().default('retailpulse'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_CHAT_MODEL: z.string().default('llama3.2'),
  // Must output 768-dim vectors to match policy_chunks.embedding (nomic-embed-text does).
  OLLAMA_EMBED_MODEL: z.string().default('nomic-embed-text'),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  // Max cosine distance for a policy passage to count as relevant evidence.
  RAG_MAX_DISTANCE: z.coerce.number().positive().default(0.4),
  // DEMO ONLY: shared PIN gating approve/reject. Not production authentication.
  DEMO_MANAGER_PIN: z.string().min(4).default('demo-manager'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
