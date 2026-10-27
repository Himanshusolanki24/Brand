# BrandProof — governance engine + brand desk

*Proof your brand before the world does.*

BrandProof reviews every piece of brand content **intake-first** against the
brand's own knowledge base: every flag cites the exact guideline clause it
broke, every suggested fix preserves intent, and nothing ships without a named
human signature on an approval manifest. The three named invariants (Round 1
plan §3.3 — names locked for Rounds 2–3):

1. **Cite it or don't flag it** — citation-anchored issue cards; findings that
   nothing in the knowledge base backs ride along labeled *advisory, uncited*.
2. **Fix, don't fight** — intent-preserving rewrites with Accept / Edit /
   Dismiss-with-reason. Nothing is auto-applied.
3. **Close the loop** — the Guideline Clarity Radar drafts guideline
   amendments; only a human (approver role) can ratify them, and ratification
   bumps the guideline version.

This repo has two apps, deliberately not named `frontend/` and `backend/`:

| Path | What it is |
|---|---|
| `desk/` | Next.js 15 + TypeScript + Tailwind — the proofing desk. Works fully offline in demo mode, talks to the engine when the engine is up. |
| `engine/` | FastAPI + SQLAlchemy async — the governance engine: deterministic checks, embeddings retrieval, RBAC, approval manifests, audit + trust graph. |

---

## Run it

### 1. Engine (port 8900)

```bash
cd engine
uv sync                      # first time
./.venv/bin/python -m uvicorn app.main:app --port 8900
# docs at http://localhost:8900/docs
```

The engine seeds a fictional org (**Meridian Coffee**, 4 reviews, 9 guideline
clauses, 5 facts, 3 certified terms, 2 approvals, 2 amendments) on first boot
and re-indexes embeddings on every boot. Reset anytime:
`rm engine/storage/engine.db` and restart.

Explore at `http://localhost:8900/docs`, or log into the desk with:

| Email | Role |
|---|---|
| `priya@meridiancoffee.com` | creator |
| `ravi@meridiancoffee.com`  | reviewer |
| `maya@meridiancoffee.com`  | approver |
| `admin@brandproof.app`     | admin |

Auth is the hackathon adapter (magic email, no password): `POST /api/auth/login`
returns a HS256 JWT whose role comes from the DB row, never from the request.
Supabase OTP swaps in later without touching the RBAC machinery.

### 2. Desk (port 3000)

```bash
cd desk
npm install                  # first time
npm run dev                  # http://localhost:3000
```

Demo mode (default): sign in with any email + demo code **0007** — the seeded
workspace runs entirely in the browser.

Product mode: run the engine on :8900 first, then sign in with a seeded email
above. If the engine answers, the desk hydrates from `GET /api/workspace` and
every action (analyze, resolve, dismiss, send-for-approval, sign, return,
ratify, manifest download) becomes a governed API call and re-syncs from the
server. If it doesn't answer, the same code opens the demo desk — nothing to
configure. `NEXT_PUBLIC_ENGINE_URL` overrides `http://localhost:8900`.

---

## What is deterministic (and verified by tests)

| Fact | Where proven |
|---|---|
| Same draft → byte-identical findings (`engine/tests/test_checks.py`) | 26 pytest tests green |
| HashingEmbedder: zero network, L2-normalized, reproducible across machines | `test_retrieval_manifest.py` |
| Manifest PDF: same approval record → identical PDF bytes + `x-manifest-sha256` | `test_retrieval_manifest.py` |
| RBAC matrix: creator can't dismiss, reviewer can't ratify/sign, role lives in the token | `test_rbac.py` |
| Tenant isolation: foreign/nonexistent ids are indistinguishable 404s | `test_rbac.py` |
| Risk gate: open high/medium findings force `route.escalate` (409) before approval | `test_retrieval_manifest.py` |
| Ratification: proposal → `v2.4-draft` version bump + clause text change + re-index | `test_workflow.py` |
| Every mutating endpoint commits **before** responding (no post-response races) | smoke `bp_smoke.py` |

Six deterministic rules fire on copy violations with live citations: §2.1
(numbers vs fact sheet), §3.1 (physiology claims), §3.2 (named competitors),
§4.1 (absolutes without an anchor), §4.2 (unverifiable superlatives), §5.1
(uncertified sustainability language). These run without any AI provider;
the LLM lane (Gemini primary, settings-adapter) is Round 3 wiring.

## Storage paths

- **Demo default**: SQLite file `engine/storage/engine.db` — no services needed.
- **Production** (documented, not exercised here — no local Postgres in the
  build environment): set `BRANDPROOF_DATABASE_URL=postgresql+asyncpg://…`,
  boot once so `create_all` builds the tables, then run
  `engine/migrations/migrations_pgvector.sql` — it installs pgvector, mirrors
  the JSON embedding column into `embedding_vec vector(384)`, and adds the
  HNSW cosine index + tenant indexes. On Postgres the retrieval dense step
  runs server-side (`1 - (embedding_vec <=> :query)`); everything else is
  unchanged. Every table carries `org_id`; scopes are enforced in SQL, not
  in application filters.

## Honest limitations

- The AI-lane (model-drafted rewrites, the "trained model" wording on the
  how-it-works page) is simulated in demo mode and deterministic-rule-based
  in engine mode; a live Gemini call is Round 3.
- Auth is the adapter with fixed seeded accounts; production Supabase OTP
  plugs into `app/security/tokens.py` (`create_token`) without route changes.
- Sign-in fallback means a dead engine silently upgrades to demo — intentional
  for the hackathon demo, flagged in the sidebar so the mode is never hidden.
- The Postgres/pgvector path is written, type-checked, and linted but not
  integration-tested in this environment; the SQLite demo path carries all
  of the 26 tests + smoke.
- Manifest PDF text is latin-1-normalized (curly quotes → ASCII) so bytes
  stay deterministic without bundling a font — international glyphs will not
  render as themselves until a font is bundled (Round 3).

## Cheatsheet

```bash
# engine
cd engine && ./.venv/bin/python -m uvicorn app.main:app --port 8900
cd engine && ./.venv/bin/python -m pytest tests -q          # 26 passed
cd engine && ./.venv/bin/python -m mypy --strict app        # 0 issues
cd engine && ./.venv/bin/python -m ruff check app           # clean

# desk
cd desk && npm run dev                                      # http://localhost:3000
cd desk && npm run build                                    # production build
```

Read `BrandProof_Build_Log_2026-10-26.md` for the full decision trail, and
`BrandProof_App_Design_Philosophy.md` for the interface language.
