-- 002: product category/brand, policy RAG tables, inventory proposals + audit log.

ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (lower(category));
CREATE INDEX IF NOT EXISTS idx_products_store ON products (store_id);

CREATE TABLE IF NOT EXISTS policies (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL,
  version         TEXT NOT NULL,
  effective_date  DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embedding dimension 768 matches nomic-embed-text (the default OLLAMA_EMBED_MODEL).
CREATE TABLE IF NOT EXISTS policy_chunks (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  policy_id        BIGINT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  section          TEXT NOT NULL,
  content          TEXT NOT NULL,
  embedding        vector(768),
  embedding_model  TEXT,
  CONSTRAINT policy_chunks_policy_section_key UNIQUE (policy_id, section)
);
CREATE INDEX IF NOT EXISTS idx_policy_chunks_embedding
  ON policy_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS inventory_proposals (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id     BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  action         TEXT NOT NULL CHECK (action IN ('increase', 'decrease')),
  quantity       INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 10000),
  reason         TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected', 'failed')),
  proposed_by    TEXT NOT NULL,
  decided_by     TEXT,
  decision_note  TEXT,
  decided_at     TIMESTAMPTZ,
  stock_before   INTEGER,
  stock_after    INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON inventory_proposals (status, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_audit_log (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id  BIGINT NOT NULL REFERENCES inventory_proposals(id) ON DELETE CASCADE,
  event        TEXT NOT NULL CHECK (event IN ('proposed', 'approved', 'rejected', 'failed')),
  actor        TEXT NOT NULL,
  details      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON inventory_audit_log (created_at DESC);
