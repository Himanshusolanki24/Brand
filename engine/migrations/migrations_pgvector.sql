-- BrandProof production DDL — PostgreSQL 16 + pgvector.
--
-- The demo engine boots on SQLite with `create_all` (app/db/database.py).
-- Pointing BRANDPROOF_DATABASE_URL at a Postgres instance switches the same
-- models onto Postgres; run THIS file once after the first boot ( Alembic
-- owns production migrations — this file is the hackathon one-shot ):
--
--     BRANDPROOF_DATABASE_URL=postgresql+asyncpg://user:pass@host/brandproof \
--         psql "$URL" -f migrations/migrations_pgvector.sql
--
-- What it does:
--   1. installs pgvector,
--   2. mirrors the JSON `embedding` column into a real `embedding_vec`
--      column (384-dim hashing model; drop/re-add the column for 1536-dim
--      OpenAI provider — dimensions must match the active embedder),
--   3. adds the HNSW cosine index retrieval uses server-side,
--   4. adds the tenant-scoped indexes every multi-org table carries.
--
-- Determinism note: HNSW is an APPROXIMATE index. BrandProof's governance
-- guarantees (every finding cites its corpus; scores reproduce) come from
-- the deterministic hash embedder + in-process cosine on the demo path. On
-- Postgres the dense step is exact within HNSW's recall; set ef_search to
-- taste (SET hnsw.ef_search = 80;) if you need it.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- 1. Vector mirror on knowledge_chunks
-- ---------------------------------------------------------------------------
ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS embedding_vec vector(384);

-- Backfill from the JSON mirror publication (JSON text '[0.12,0.44,…]'
-- parses directly as a pgvector literal).
UPDATE knowledge_chunks
SET embedding_vec = embedding::text::vector
WHERE embedding_vec IS NULL AND embedding IS NOT NULL;

DROP INDEX IF EXISTS knowledge_chunks_embedding_hnsw;
CREATE INDEX knowledge_chunks_embedding_hnsw
    ON knowledge_chunks
    USING hnsw (embedding_vec vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ---------------------------------------------------------------------------
-- 2. Tenant-scoped access paths (every table carries org_id by design)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS reviews_org_status_idx   ON reviews (org_id, status);
CREATE INDEX IF NOT EXISTS issues_review_idx        ON issues (review_id);
CREATE INDEX IF NOT EXISTS issues_org_status_idx    ON issues (org_id, status);
CREATE INDEX IF NOT EXISTS approvals_org_state_idx  ON approvals (org_id, state);
CREATE INDEX IF NOT EXISTS approvals_review_idx     ON approvals (review_id);
CREATE INDEX IF NOT EXISTS learning_org_state_idx   ON learning_proposals (org_id, state);
CREATE INDEX IF NOT EXISTS audit_org_at_idx         ON audit_logs (org_id, at DESC);
CREATE INDEX IF NOT EXISTS content_versions_item_idx ON content_versions (item_id, ordinal DESC);
CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx ON knowledge_chunks (org_id, source_type);

-- ---------------------------------------------------------------------------
-- 3. When the embedder changes (hash → OpenAI text-embedding-3-small),
--    dimensions differ. The re-index on boot repopulates knowledge_chunks
--    with the new model id; re-run this to mirror the new width:
--
--    ALTER TABLE knowledge_chunks DROP COLUMN embedding_vec;
--    ALTER TABLE knowledge_chunks ADD COLUMN embedding_vec vector(1536);
--    UPDATE knowledge_chunks
--      SET embedding_vec = embedding::text::vector
--      WHERE embedding IS NOT NULL;
--    -- then re-run the HNSW index block above.
--
--    The retrieval service reads embedding_model per row and refuses to
--    compare vectors across models, so a partially-migrated corpus degrades
--    to keyword-scored hits rather than cross-model nonsense.
-- ---------------------------------------------------------------------------
