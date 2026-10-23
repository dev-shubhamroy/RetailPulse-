# RetailPulse AI

A local-first retail assistant (hackathon MVP):

1. **Stock-aware recommendations** – the LLM turns a request into search criteria; the backend validates (Zod), filters (budget, store, stock) and ranks deterministically; the LLM only explains.
2. **Policy Q&A with citations (RAG)** – policy passages are embedded with Ollama into pgvector; answers cite policy title, version and section, or say the policies don't support an answer.
3. **Approval-gated inventory changes** – staff propose stock adjustments; only a manager approval (backend transaction, row locks, audit log) changes stock. The LLM never writes to the database.

Stack: React + Vite + Tailwind, Node/Express (ES modules), PostgreSQL 16 + pgvector, Ollama, Zod.

## Prerequisites
- Node.js 20+ (22 recommended)
- PostgreSQL 16 with the `pgvector` extension, and a database/role matching your `.env` (or Docker: `docker compose up -d` uses `docker-compose.yml`)
- [Ollama](https://ollama.com) for live AI (the app still runs without it, using fallbacks)

## Setup
```bash
cp .env.example .env          # then set POSTGRES_PASSWORD to match your database role
cd backend && npm install && npm run migrate && npm run seed
cd ../frontend && npm install
```

### Ollama models
```bash
ollama pull llama3.2           # chat / interpretation / explanations (OLLAMA_CHAT_MODEL)
ollama pull nomic-embed-text   # 768-dim embeddings (OLLAMA_EMBED_MODEL)
cd backend && npm run ingest:policies   # embed policy passages into pgvector
```
The `policy_chunks.embedding` column is `vector(768)`. If you use a different embedding model it must also output 768 dimensions, otherwise add a migration. Changing `OLLAMA_EMBED_MODEL` automatically re-embeds on the next ingest.

## Run
```bash
cd backend && npm run dev      # http://localhost:4000  (health: /api/health)
cd frontend && npm run dev     # http://localhost:5173
```

## Environment variables (`.env.example`)
| Variable | Purpose |
|---|---|
| `PORT`, `CORS_ORIGIN`, `NODE_ENV` | Backend server |
| `POSTGRES_*` | Database connection |
| `OLLAMA_BASE_URL`, `OLLAMA_CHAT_MODEL`, `OLLAMA_EMBED_MODEL`, `OLLAMA_TIMEOUT_MS` | Local AI |
| `RAG_MAX_DISTANCE` | Max cosine distance for a passage to count as evidence (default 0.4, measured with nomic-embed-text: supported questions score about 0.2-0.3, unsupported 0.47+; tune per embedding model) |
| `DEMO_MANAGER_PIN` | **Demo only** shared PIN for approve/reject. Not real authentication. |

`.env` is git-ignored. Never commit it.

## Scripts (`backend/`)
`npm run migrate` · `npm run seed` (idempotent; never overwrites existing stock) · `npm run ingest:policies` · `npm test`

## Behaviour without Ollama
- Recommendations fall back to a rule-based parser (category, budget, store, "in stock"); results are still real DB rows.
- Policy questions fall back to Postgres keyword search and show cited passages without a generated answer.
- The UI shows a notice whenever a fallback is used.

## Tests
`cd backend && npm test` runs integration tests against your local database. Ollama is replaced by a **stub server**, so tests verify our code paths, validation and fallbacks, not real-model quality. Tests clean up the rows they create and restore stock.

## Demo script
1. **Dashboard** – live counts, low-stock list, embedded policy passages.
2. **Products** – search "aero", filter by store/in-stock, page through results.
3. **AI Assistant → Find products** – "Find me a laptop under ₹70,000", then "Which headphones are available in stock?". Note the budget/stock are enforced by the backend, and cards come from the database.
4. **AI Assistant → Policy question** – "How long do I have to return a laptop?" (cites Returns Policy v2.1, section 1). Then "Do you sell pizza?" to see the refusal to guess.
5. **Store Operations** – propose "decrease 2" for a product, show stock unchanged and status *pending*; enter the manager PIN (demo default: `demo-manager`, from `DEMO_MANAGER_PIN`) and approve; show stock change and audit log; try approving again (blocked).
6. Mention: LLM interprets and explains; deterministic code validates, retrieves, ranks, authorises and writes.

## Layout
`backend/src/{ai,controllers,repositories,routes,validators,middleware,db}` · `frontend/src/{pages,components,services,hooks,layouts}` · `tests/` · the top-level `ai/` folder is reserved and currently unused (AI code lives in `backend/src/ai`).
