-- 001_init: pgvector extension, stores, products.
-- Runs inside a transaction (see migrate.js); do not add BEGIN/COMMIT here.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS stores (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE CHECK (length(btrim(code)) > 0),
  name        TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  city        TEXT,
  address     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id        BIGINT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  sku             TEXT NOT NULL CHECK (length(btrim(sku)) > 0),
  name            TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  description     TEXT,
  price           NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_store_sku_key UNIQUE (store_id, sku)
);

-- (store_id, sku) is already indexed by the unique constraint.
CREATE INDEX IF NOT EXISTS idx_products_name ON products (lower(name));
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores (is_active);

DROP TRIGGER IF EXISTS trg_stores_updated_at ON stores;
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
