# BrandProof — Full Build Log (October 26, 2026)

> One-day record of the two phases built for the **Inkloom AI Hackathon**: the Round 1
> plan submission and the complete Round 2 frontend. This file lists what was made,
> every decision made along the way, how each piece was built, what was verified,
> and what remains.

---

## 1. Today at a glance

| Phase | Deliverable | Location | Status |
|---|---|---|---|
| 1 | Round 1 submission — *The Plan* (full text + 10 hand-sketch diagrams) | `BrandProof/BrandProof_Round1_Full_Plan.docx` | Done |
| 2 | Complete frontend demo — Next.js app, 10 routes, proofing-desk design system | `BrandProof/desk/` | Done, builds clean, smoke-tested |
| 3 | Full backend — FastAPI governance engine (RBAC, deterministic checks, embeddings, manifests) | `BrandProof/engine/` | Done — 26 tests, mypy strict clean, all smoke checks pass |
| 2→3 | Frontend wired to the engine (product mode hydration + governed actions) | `BrandProof/desk/src/lib/{api.ts,store.tsx}` | Done |
| 2 | Design philosophy doc (drives the UI) | `BrandProof/BrandProof_App_Design_Philosophy.md` | Done |
| — | This build log | `BrandProof/BrandProof_Build_Log_2026-10-26.md` | You're reading it |

Team context: 4–5 full-stack + AI/ML members, extremely tight deadlines, AI/boilerplate
use must be disclosed inside the official build window.

---

## 2. The product in one paragraph

**BrandProof** — *"Proof your brand before the world does."*
A brand-governance platform: every piece of brand content is reviewed at intake
against the brand's own knowledge base (guidelines, fact sheet, terminology, assets).
Every flag cites the exact guideline clause it broke. Every suggested fix preserves
the writer's intent. Nothing is auto-applied, nothing is auto-approved — every piece
ends with a named human signature on an approval manifest. The three named
improvements (locked, must keep identical names in Rounds 2–3):

1. **Cite it or don't flag it** — citation-anchored issue cards; uncited findings are labeled "advisory, uncited".
2. **Fix, don't fight** — intent-preserving rewrites; Accept / Edit / Dismiss-with-reason, never auto-applied.
3. **Close the loop** — the Guideline Clarity Radar drafts guideline amendments; a human ratifies them.

Committed stack (from the Round 1 plan): Next.js 15 + TypeScript + Tailwind + React 19
frontend; FastAPI backend; PostgreSQL 16 + pgvector (Neon); Supabase Auth/RBAC/Storage;
Gemini 2.5 Flash primary with GPT-4.1-mini fallback behind one adapter; Vercel deploy.
RBAC roles: Creator, Reviewer, Approver, Admin.

---

## 3. Phase 1 — the Round 1 plan (morning work)

- Wrote the complete plan with originality, feasibility, market data and system design —
  in **smart, plain language** (the user explicitly rejected dense corporate prose).
- Researched and cited an evidence base: Marq/Lucidpress brand-consistency rework data,
  WebAIM Million 2025 accessibility stats, Ahrefs 2025, Basis, IAB, Markup AI, SAS —
  11-item reference appendix inside the document.
- Created **10 Napkin-style hand-drawn diagrams** with the `sketch.py` renderer
  (`~/.claude/skills/sketch-deck/scripts/sketch.py`) — the visual identity the user
  warmed to; this is what seeded the app's design direction.
- Merged everything into a single self-contained DOCX —
  `BrandProof_Round1_Full_Plan.docx` — verified intact: **201 paragraphs, 10 images,
  45,960 characters**. This remains the single source of truth; the frontend was built
  against its §3.3/§4.1 UI contract (issue-card fields, verdict buttons, manifest).
- The user's scratch files (Markdown source, diagram PNGs, generator scripts, separate
  PDFs) were later cleaned from Downloads by the user; everything lives on inside the
  DOCX and is regenerable.
- Open placeholders: `[TEAM NAME]` and `[TEAM LEAD EMAIL]` in the DOCX — never supplied.

---

## 4. Phase 2 kickoff — how the frontend was scoped

**Skills loaded first (9, at the user's request):** senior-frontend-dev,
frontend-design, canvas-design, canvas-design-frontend, react-expert,
nextjs-developer, grill-me/grilling, report, plus the matched sketch system.

**One round of frontier questions (grilling skill) with recommended answers — user picked:**

| Question | Answer |
|---|---|
| Scope: complete app or core flow? | **"Yes, but only frontend"** — all ~8 screens, frontend-only |
| Data: demo seed or wire backend now? | **Seed/sample data now; real backend built later behind the same data layer** |
| Visual direction? | **"Proofing desk" style** — editorial ink-on-paper UI with hand-sketch echoes |

Environment facts established: Node **22.20.0**, npm 10.9.3 on macOS. Working folder
`/Users/himanshusolanki/Downloads/BrandProof/brandproof-web/`. Design constraints from
the frontend-design skill: avoid the generic AI-tells (cream+serif+terracotta default,
SaaS card soup, ALL-CAPS eyebrow labels, "→" appended to links, tinted-black, mono
label font story, middot meta strings).

---

## 5. How the app was built (step by step)

### 5.1 Scaffold
```bash
NEXT_TELEMETRY_DISABLED=1 npx --yes create-next-app@15 brandproof-web \
  --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```
Result: Next.js **15.5.28 / App Router / Turbopack / Tailwind v4 / React 19.1.0 /
TypeScript strict / git repo initialized inside the app folder** (kept out of the
hackathon folder root on purpose).

### 5.2 Dependencies
Only two runtime additions beyond the scaffold: `clsx` (class merging) and
`lucide-react` (icons). **Deliberately no UI kit** — shadcn was considered and skipped:
hand-rolled primitives gave full design control, fewer moving parts, faster to ship,
and honors the native-first rule (semantic HTML, real `<dialog>`).

### 5.3 Build order (bottom-up)
1. `globals.css` — design tokens (Tailwind v4 `@theme`/`@theme inline`), highlight
   `mark.proof` states, native-dialog theming, `.stamp` class, reduced-motion guard.
2. `layout.tsx` — fonts via `next/font`: **Bricolage Grotesque** (display),
   **Instrument Sans** (UI), **Caveat** (hand annotations).
3. `lib/types.ts` — full typed data model.
4. `lib/seed.ts` — the seeded fictional workspace (see §7).
5. `lib/analyze.ts` — the client-side demo analyzer (regex rule set).
6. `lib/store.tsx` — `useReducer` + Context store, 11 action types.
7. UI kit — `ui/button.tsx`, `ui/modal.tsx` (native `<dialog>` + `showModal()`),
   `ui/pills.tsx` (severity/confidence/status/stamp).
8. Sketch system — `components/sketch.tsx`: `wobblePath()` (deterministic pseudo-random
   jitter → identical SVG on server and client, zero hydration drift), `SketchUnderline`,
   `Wordmark`, three napkin diagram components; `components/app/clarity-radar.tsx`.
9. App shell — `components/app/sidebar.tsx` (grouped nav with live badge counts, demo
   role switcher, mobile nav variant) + `app/app/layout.tsx` (DemoProvider wrapper).
10. Pages — dashboard, reviews list, review detail (centerpiece), guidelines,
    intake, approvals, sign-in, how-it-works, landing.

### 5.4 Key implementation decisions
- **Deterministic sketching**: the digit-mixing-jitter trick (`sin(i*12.9898+seed)`) so
  wobbly SVGs never differ between SSR and hydration (a hand-rolled `Math.random()`
  would crash React 19 hydration).
- **Interactive end-to-end, not canned**: the demo analyzer actually runs on pasted
  text (§7.3) — intake → flags → decisions → approval is a real state machine.
- **Rule-faithful UI contract**: every card shows severity + confidence (e.g. 0.87),
  the cited clause as a clickable chip ("Read the clause" → full clause modal), the
  before/after fix with rationale in one block, and exactly three verdicts; Dismiss is
  impossible without a written reason (UI + logic enforce this, with a visible error).
- **Role demo**: a sidebar switcher (Creator/Reviewer/Approver/Admin) plus visible
  role labels — honest stand-in for Supabase RBAC until the backend exists.
- **Design**: "The Proofing Desk" (§6) — restraint-led: color only for red pen
  (flags), green ink (signatures), citation blue (authority); documents-not-cards
  information design.

---

## 6. The design system — "The Proofing Deck"

Concept (from `BrandProof_App_Design_Philosophy.md`): a publisher's proofroom rebuilt
for AI-era drafts. Near-white proofing paper, blue-black ink, and the three working
instruments of an annotator:

| Token | Hex | Meaning |
|---|---|---|
| `--color-paper` | `#FBFAF7` | proofing paper (background) |
| `--color-desk` | `#F2F0E9` | chrome/rails |
| `--color-sheet` | `#FFFFFF` | document surfaces |
| `--color-ink` | `#1C2536` | blue-black text (not tinted-black) |
| `--color-ink-soft` | `#5A6270` | secondary text |
| `--color-line` / `line-strong` | `#E5E1D6` / `#CFCCC2` | hairlines |
| `--color-redpen` (+wash) | `#C2402A` (`#FAE9E4`) | flags, discipline, sweetness never |
| `--color-pencil` (+wash) | `#8A601E` (`#F6ECDC`) | medium severity, hand notes |
| `--color-greenink` (+wash) | `#1F6B4A` (`#E7F0E8`) | approvals, accepted lines |
| `--color-cite` (+wash) | `#2457C5` (`#EAF0FC`) | clause links, authority |

Fonts: Bricolage Grotesque — display (a voice with an opinion); Instrument Sans —
working UI; Caveat — only where a human would genuinely write (advisory tags, radar
labels, "no canned rewrite" notes, empty states). Documents are rendered as documents
(headings, margins, in-place highlighted spans) — issue cards live on a separate
proofing tray, each with a different natural height, like masking-taped notes.
Motion answers actions only (stamps land, verdicts count down); nothing idles.

---

## 7. The data layer

### 7.1 Types (`lib/types.ts`)
`Role`, `Severity`, `IssueStatus`, `ReviewStatus` (analyzing → in_review →
changes_requested → ready_for_approval → approved), `Channel`, `Citation`,
`GuidelineSection`, `ProofFact/Term/Asset`, `ContentSection`, `Issue`
(severity, confidence, headline, detail, citation|null, suggested, rationale,
status, reason, replacement), `Review`, `ApprovalEntry`, `Amendment`,
`ClarityAxisScore`, `DemoState`.

### 7.2 Store (`lib/store.tsx`)
`useReducer` + Context. Actions: `resolve` (accept/edit with replacement),
`dismiss` (reason required downstream), `reopen`, `ready` (creates a waiting
manifest entry for Maya Okafor), `sign` (stamps + flips review to approved),
`return` (note travels back to the writer), `analyze` (inserts analyzing review),
`analysisDone` (attaches computed issues), `ratify` (amendment → guideline text,
version v2.3→v2.4-draft, radar +5), `setRole`. Local state only; resets on reload;
swaps cleanly to a real API later because pages touch no transport.

### 7.3 Demo analyzer (`lib/analyze.ts`) — real, not canned
Six regex rules + one soft rule, each wired to a clause:

| Pattern | Clause | Severity | Confidence |
|---|---|---|---|
| Superlatives (best/finest/world-class/number one…) | §4.2 | High | 0.87 |
| Percentages the fact sheet can't anchor | §2.1 | High | 0.90 |
| Physiology/energy claims | §3.1 | High | 0.88 |
| Named competitors in copy | §3.2 | High | 0.83 |
| Absolutes (always/never/guaranteed) | §4.1 | Medium | 0.72 |
| Uncertified eco language | §5.1 | High | 0.85 |
| Sentences > 30 words | — | Low | 0.55 (advisory, uncited) |
| Nothing matched | — | Low | 0.70 — "clean pass, one look-over item" so a human still reads it |

### 7.4 Seed workspace (`lib/seed.ts`) — fictional brand: **Meridian Coffee**
- **Guidelines v2.3** — 8 clauses with per-clause clarity scores: 1.1 Voice & tone
  (c74), 1.2 Honesty default (—), 2.1 Numbers match the fact sheet (c38), 3.1 Health
  and physiology claims (c61), 3.2 Competitor comparisons (c69), 4.1 Every claim needs
  an anchor (c52), 4.2 No unverifiable superlatives (c44), 5.1 Sustainability
  language (c47).
- **Fact sheet** — f1 USDA Organic cert (Oregon Tilth, renewed Sep 2025), f2 235 mg
  caffeine per 12 fl oz (lab panel), f3 two smallholder partners (Huila + Yirgacheffe),
  f4 roast-to-ship median 2.1 days, f5 30-day money-back on first orders.
- **Terminology** — cold brew ≠ iced coffee, smallholder lot, roast date, flash-chill.
- **Assets** — logo lockup, palette, voice card, the approved competitor chart
  (the only place competitor names may appear — §3.2).
- **Four reviews covering every workflow state**:
  - `rv1` *April email — cold brew launch* — in review, **6 issues** (the uncited
    "best in America" superlative at 0.87; the 40%-acidity figure at 0.91; a stomach/
    clean-energy claim at 0.88; "best price anywhere"; "guaranteed fresh"; one
    advisory "stacked promise" flag).
  - `rv2` *Homepage banner refresh* — changes requested by Ravi Suri; one flag
    **dismissed with a written reason** (a third-party ranking was filed), one accepted.
  - `rv3` *SMS re-engagement flow* — **approved**; shows a hand **Edit** ("Something
    cold is waiting in your cart") and an accepted advisory.
  - `rv4` *Investor deck v4 — traction slide* — **analyzing** (progress steps UI).
- **Approvals** — one signed (Maya Okafor), one returned ("comparison claim needs the
  signed ranking attached").
- **Clarity Radar** — Specificity 42, Testability 58, Consistency 64, Coverage 38,
  Predictability 71, each with a plain-language note.
- **Two draft amendments** the radar proposes (eco-language ban → §5.1; number-claims
  escape hatch → §2.1), ratifiable in one click.

---

## 8. The ten routes

| Route | Type | What it does |
|---|---|---|
| `/` | static | Landing: hero with red-pen underline, a real-looking flagged sentence, the three named improvements with sketch diagrams, honest "why now" framing |
| `/signin` | client | Mock email OTP — any address, demo code `0007` shown openly, simulated auth disclosed |
| `/app` | client | Proofing desk overview: 4 stat panels (open flags, in flow, awaiting signature, signed), Clarity Radar + notes, **ratifiable draft amendments**, recent reviews |
| `/app/reviews` | client | Desk list sorted newest-first with per-severity open counts and status pills |
| `/app/reviews/[id]` | client | **Centerpiece** — document w/ in-place highlighted flags (click a mark → scrolls to its card), analyzing-progress panel for new reviews, proofing tray with issue cards, send-for-approval gate, returned-notes banner, approval stamp |
| `/app/intake` | client | Title/channel/copy form → runs the real demo analyzer → routes to the new review; shows the six checks + citation-sketch explainer |
| `/app/guidelines` | client | Knowledge base: Guidelines (with clarity bars), Facts, Terminology, Assets tabs; Clarity Radar + draft amendments with ratify flow |
| `/app/approvals` | client | The manifest: sign by typing the approver's full name, or return with an (optional-but-encouraged) note; empty state states the no-auto-approval rule |
| `/how-it-works` | static | AI disclosure: what's automated (regex demo pass), what the real product runs (Gemini 2.5 Flash + pgvector retrieval, GPT-4.1-mini fallback), what's simulated, the four "nevers", team AI-use disclosure, stack |
| friend-of-all | — | Sidebar rails: grouped nav, live open-flag/approval badges, demo role switcher, "How this review works" always one click away |

---

## 9. Files created in `brandproof-web/` (inventory)

```
src/app/
  globals.css                      design tokens + marks/dialog/stamp/reduced-motion
  layout.tsx                       fonts (Bricolage/Instrument/Caveat) + metadata
  page.tsx                         landing
  how-it-works/page.tsx            AI disclosure page
  signin/page.tsx                  mock OTP sign-in
  app/layout.tsx                   DemoProvider + sidebar shell
  app/page.tsx                     dashboard (radar, amendments, desk stats)
  app/reviews/page.tsx             reviews list
  app/reviews/[id]/page.tsx        review screen (document + proofing tray)
  app/guidelines/page.tsx          knowledge base (4 tabs + amendments)
  app/intake/page.tsx              new review + demo analyzer
  app/approvals/page.tsx           approval manifest (sign/return)
src/lib/
  types.ts                         full data model
  seed.ts                          Meridian Coffee workspace seed
  analyze.ts                       six-clause demo analyzer
  store.tsx                        reducer + context (11 actions)
src/components/
  sketch.tsx                       wobblePath + underline/wordmark/3 napkin diagrams
  ui/button.tsx  ui/modal.tsx  ui/pills.tsx
  app/clarity-radar.tsx            hand-drawn radar (SVG, 5 axes)
  app/sidebar.tsx                  nav + badges + role switcher (+ mobile rail)
  app/issue-card.tsx               the citation-anchored verdict machinery
next.config.ts                     pins outputFileTracingRoot + turbopack root
README.md                          run instructions + honest demo description
BrandProof_App_Design_Philosophy.md (sits one level up, in BrandProof/)
```

---

## 10. Verification trail (what failed, what was fixed, what passed)

**Build errors hit and fixed en route:**
1. `Module not found: './sketch'` in `clarity-radar.tsx` → import path corrected to `"../sketch"`.
2. TS type error — `DemoAction.resolve/dismiss` demanded an unused `by: string` → made optional in the action union (sign/return keep their attribution).
3. Unused `clsx` import warning in intake → removed.
4. Unescaped apostrophe danger (`react/no-unescaped-entities`) — proactively rewrote JSX text ("has not read this one yet"); seed date `2025-Q4` unparseable by `Intl` → changed to a real date.
5. Next.js lockfile/workspace-root warning (stray `~/package-lock.json` poisoning inference) → pinned `outputFileTracingRoot` + `turbopack.root` in `next.config.ts`; verified warning gone.

**Final production build (zero errors):**

| Route | First Load JS |
|---|---|
| `/` 119 kB · `/how-it-works` 119 kB · `/signin` 119 kB | |
| `/app` 133 kB · `/app/approvals` 132 kB · `/app/guidelines` 133 kB | |
| `/app/intake` 131 kB · `/app/reviews` 131 kB · `/app/reviews/[id]` 137 kB (dynamic) | |
| Shared | 123 kB |

**Runtime smoke tests:** production `next start -p 3117` → `200` on `/`,
`/how-it-works`, `/app`, `/app/reviews/rv1`, `/signin`; SSR HTML contained
"Proofing tray" and the hero headline. Dev server (`npm run dev`, port 3000) ran the
full demo afterward — every page compiled and served 200 — then stopped on request.

---

## 11. Honest limitations (all stated on `/how-it-works` too)

**Phase 2 state (at the time of writing) — superseded by Phase 3 (§14) on the
backend; both modes are now real:**

- **Backend fully simulated**: seeded data in reducer state; reloads reset the demo;
  nothing persists or transmits. → *Phase 3 adds the real engine; the demo stays
  available when no engine is running.*
- **Analyzer is rule-based**, not the trained model: the four transparent steps mirror
  the real pass; a live Gemini call is Round 3 wiring.
- **RBAC is a demo switch**, not enforcement: real gating arrives with Supabase Auth.
  → *Phase 3 ships real RBAC (role-from-token, permission matrix, 403s tested).*
- **No persistence** (localStorage was skipped on purpose — demo state clarity).
  → *Phase 3 persists on the engine (SQLite/Postgres).*
- Scenario data is **fictional (Meridian Coffee)** — no real customer content anywhere.

## 12. What's next

1. ~~Wire `lib/store.tsx` behind a fetch-based service layer → FastAPI endpoints from
   the Round 1 plan (same shapes already typed).~~ **Done in Phase 3** — the desk now
   hydrates from the real engine (`GET /api/workspace`) and every action is a governed
   call; demo mode stays for offline runs. Details in §14.
2. Deliverables not yet finished from Round 1: the team-name placeholders in the DOCX;
   optional matching PDF export of the full plan.
3. Round 3 packaging: repo → GitHub/zip + a demo script; deploy to Vercel if desired.
4. Nice-to-haves if deadline allows: apple-touch icons, review-list filters, a short
   screen-capture walkthrough.

## 13. Commands cheatsheet

```bash
cd ~/Downloads/BrandProof/desk
npm run dev          # http://localhost:3000 (demo code 0007 at /signin; engine-aware)
npm run build        # produce the verified production build
npm start            # serve the production build
npm run lint         # eslint pass

# engine — see §14
cd ~/Downloads/BrandProof/engine
uv sync                                        # first time
./.venv/bin/python -m uvicorn app.main:app --port 8900
```

---

## 14. Phase 3 — the governance engine (same evening, post-frontend)

> Built the full backend the Round 1 plan demands, then wired the desk to it.
> Folder names are intentional: **`engine/` + `desk/`**, not `frontend/`+`backend/`
> (the spec asked for structure that isn't the generic split).

### 14.1 Stack + shape

| Choice | Call | Why |
|---|---|---|
| FastAPI + SQLAlchemy **async** + Pydantic v2 | single `engine/app` package | matches the plan's stack; async engine keeps one worker honest |
| Python 3.12 via **uv** (`uv sync`) | reproducible env in seconds | hackathon time discipline |
| **SQLite** demo default (`storage/engine.db`) | zero services to run the demo anywhere | Postgres+pgvector path provided via env var + migration (§14.6) |
| **Postgres path**: `BRANDPROOF_DATABASE_URL=postgresql+asyncpg://…` + `migrations/migrations_pgvector.sql` | pgvector mirror column + HNSW cosine index | same models, no code fork |
| Deterministic **HashingEmbedder** (char-trigram → 384-dim, L2-normalized, model id `hash-trigram-384@1`) | "Cite it or don't flag it" works with no API keys | demo/offline determinism; OpenAI embedder swaps in by env |
| JWT (HS256) with role from the DB row | RBAC issuance in one function | percent-ready for Supabase OTP adapter |

Wire format mirrors `desk/src/lib/types.ts` exactly (Pydantic `serialize_by_alias`),
so a workspace hydration is a straight cast — no schema drift can hide.

### 14.2 The engine surface (`engine/app`)

```
app/
  main.py            app factory + lifespan (seed + re-index embeddings per boot; problem+json handlers)
  settings.py        env-first settings (BRANDPROOF_* prefix)
  contracts.py       Pydantic mirror of the desk types (single source of the wire format)
  db/
    models.py        16 tables — every one carries org_id
    database.py      engine/session factory; tenants scoped in SQL, not app filters
    seed.py          Meridian Coffee corpus 1:1 with the desk seed (rv1–rv4, rv1-i1…i6 …)
  security/
    rbac.py          Role × Permission matrix (creator/reviewer/approver/admin)
    tokens.py        JWT issue/verify
    deps.py          DI: principal extraction, require_permission/require_role, per-request session (commit-before-response)
    errors.py        problem+json contract (RFC 7807-shaped)
  checks/
    engine.py        the 6 deterministic rules + advisories (citation-or-nothing enforced here)
    conflicts.py     governance-gap / expired-rule detection against the live corpus
  services/
    embeddings/      providers (Hashing/OpenAI) + indexer + chunker
    retrieval.py     hybrid scoring: dense (pgvector server-side on Postgres, in-process cosine on SQLite)
                     + IDF keyword blend 0.6/0.4, k clamped to 5–8, org-scoped by construction
    manifest_pdf.py  deterministic approval-manifest PDF (fpdf2; latin-1 chokepoint for byte-stability)
  workflow/pipeline.py  analyze stages: checks → evidence retrieval (verdicts) → risk routing
  api/routes/        auth, workspace, reviews, approvals, proposals, trust(+admin)
  migrations/
    migrations_pgvector.sql   production DDL (documented; not exercised here)
tests/               26 pytest tests (checks golden/determinism, RBAC matrix, retrieval/manifest, workflow)
```

### 14.3 Bugs worth remembering (each hit for real)

1. **Router not mounted** — the Workspace endpoint worked in tests and 404'd live:
   the router existed but was never `include_router`ed. Symptom: clean tests,
   broken API. Lesson: smoke every route on a RUNNING server.
2. **Missing `Review.title`** — the desk's contracts carry the denormalized title;
   the engine table lacked it. Fixed in models + seed + pipeline persist.
3. **Seed shapes drifted** — rv1 needed its 6 findings to match the desk fixture.
4. **Amendments serialized as ORM rows** — `WorkspaceSnapshot` demanded contract
   models; passing `LearningProposal` entities blew up in pydantic. Mapped
   explicitly.
5. **Commit-after-response races** — FastAPI dependency teardown runs *after* the
   response is sent; the first `resolve` after `analyze` could 404. Rule
   adopted: **every mutating handler commits before returning.**
6. **Ephemeral pipeline ids** — the pipeline returned display ids (`chk-…`) that
   had no DB row; the desk couldn't resolve what it was shown. Persisted ids
   (`iss-…`) now ARE the wire ids.
7. **Approver-lane assignment** — alphabetical ordering picked the admin; the
   spec's preference: dedicated approver first, admin fallback.
8. **fpdf2 unicode** — the manifest PDF died on §/curly quotes with core fonts.
   Solved inside a `ManifestPDF(FPDF)` subclass normalizing every emitted
   string at one chokepoint (deterministic bytes without a bundled font).
9. **`on_event` → lifespan** — FastAPI constructor `lifespan=` parameter; the
   post-hoc `router.lifespan_context` reassignment gets merged away by
   FastAPI internals. Also: two `app = …` module lines existed — the second
   silently overwrote the lifespan-wired app. Cut.

### 14.4 Verification

| Check | Result |
|---|---|
| `pytest tests -q` | **26 passed** (checks, RBAC, retrieval+manifest, workflow) |
| `mypy --strict app` | **0 issues in 34 files** |
| `ruff check app` | clean (52 findings → 0) |
| smoke script (4 logins + 40 check-points) | **ALL SMOKE CHECKS PASSED** — RBAC matrix, tenant isolation, role-mismatch 409, live citations on all 6 rules, risk gate 409 `route.escalate`, analyze→resolve→send→sign + wrong-approver 403, deterministic manifest bytes + sha header, trust graph, conflicts (governance_gap §1.2, expired §6.1), ratify → `v2.4-draft` + clause text + re-index (18 chunks), admin cross-role read |
| desk `next build` + `tsc --noEmit` | clean |
| desk routes on dev server | 200 on `/`, `/signin`, `/app`, `/app/intake` |

### 14.5 The desk ↔ engine wiring (product mode)

- `desk/src/lib/api.ts` — engine client (auth, workspace, analyze, issue
  actions, approvals, ratify, manifest PDF blob download).
  `NEXT_PUBLIC_ENGINE_URL` env override; default `localhost:8900`.
- `desk/src/lib/store.tsx` — `connect/disconnect/refresh`, token in
  localStorage; **product mode** interception: mutating dispatches become
  governed API calls that re-hydrate from the authoritative snapshot; the
  reducer fully serves demo mode. Engine failures surface as an inline
  strip, never a silent fallthrough.
- Sign-in (`0007`): engine answers → real identity + workspace; engine down →
  same code opens the demo desk (mode shown in the sidebar).
- Intake: product mode posts to `POST /api/reviews/analyze` and renders the
  engine's real findings (advisory items ride along uncited exactly like the
  demo).
- Approvals: signed lanes gain a **Manifest** download (deterministic PDF +
  sha header) in product mode.

### 14.6 pgvector (production storage)

`migrations/migrations_pgvector.sql` — pgvector extension, `embedding_vec
vector(384)` mirror column + backfill, HNSW cosine index, tenant indexes.
Retrieval's dense step runs `1 - (embedding_vec <=> :query)` server-side on
Postgres and stays in-process cosine on SQLite. **Not integration-tested in
this environment** (no local Postgres); the SQLite demo path carries all tests.


---

## 15. Phase 4 — the Inkloom build of the desk frontend

> Closing act, following `~/Downloads/inkloom_ai_frontend_complete.md` (the
> Inkloom AI frontend spec, judge criterion: **submit content → real findings +
> evidence → understand a suggested correction → complete the review/approval
> flow — with no fake functionality**) under the accepted build contract
> `BrandProof/concepts_brief.md`. The countdown names changed ownership: the app
> is now **Inkloom**; `engine/` stays untouched throughout (verified again at the
> end, §15.6). Folder and README keep the repo names; the product surfaces say
> Inkloom.

### 15.1 The anti-fabrication contract (every phase checked against it)

| Rule | How the desk honors it |
|---|---|
| Never fabricate findings, evidence, approval states, or metrics | Findings ship with `verification: null` unless the engine produced one; unavailable data renders as unavailable prose, never as a synthetic empty state |
| Product-only surfaces show no sample data | Demo lane renders only what the seed fixtures can produce, under a persistent **"Sample desk — demo data"** chip (sidebar, engine-error aware) |
| Approver identity is never a constant | Every sign/return attribution reads from `ApprovalEntry.approver` / the signed-in seat |
| RBAC mirrors the engine, fail-closed | `src/lib/permits.ts` — `can(role, permit)`; unknown seat ⇒ no permission; every call site passes `session?.user.role ?? state.role` |
| Can't do ⇒ you know why | Disabled actions carry the gate reason (e.g. HIGH-open block mirrors the engine's 409 `route.escalate`) |

### 15.2 Phase I — the data floor (parity with the engine's wire truth)

- **`types.ts`** — `Verification` (`verified` / `contradicted` / `unclear`) + labels;
  `Issue` gains `evidenceIds`, `agent` (`policy_checks` / `advisory`), nullable
  `verification`; `Review` gains `policyVersion`; traceability-graph types added.
- **`api.ts`** — `trust`, `proposals`, `checksPreview` endpoints added; hydration
  via a strict `snapshotToState` that **spreads no seed defaults** — wire absence
  stays absence.
- **`store.tsx`** — `ready` takes its approver; ratify mirrors the engine exactly:
  amendment text appended (with the `Add to §x: ` prefix stripped), clarity
  `min(95, clarity + 10)` only when a score exists (nulls stay null), version
  bumps only when not already `-draft`; the radar axes are never touched by
  mutation.
- **`seed.ts`** — 1:1 with the engine's seed: only `rv2-i2` carries
  `verification: "contradicted"` + `evidenceIds: [f3]`; `rv1-i6` is the lone
  `agent: "advisory"` finding; everything else is `null` / `[]` / `policy_checks`.
- **`analyze.ts`** — the demo runner does no retrieval, so its findings stay
  `verification: null` (copy never implies "false"); weak globals can't leak
  demo data into product mode. Demo intake posts `policyVersion` like the desk.

### 15.3 Phase II — the P0 review loop (the judged surface)

- **Pills** — `ConfidenceTag` ("Analysis confidence 87%"), `VerificationPill`
  (verified / contradicted / unclear — and a neutral "Status: raw" when null),
  "Sent back for fixes", `SkeletonRow` for the analyzing state.
- **Issue card** — verdicts are **"Keep line as-is"** / **"Rewrite this line"**
  (Dismiss is role-gated); evidence drawer joined from `state.facts` (f-ids in
  mono); the verification pill only ever appears when the engine wrote one.
- **Workspace (`/app/reviews/[id]`)** — hash anchors `#f=<issueId>` / `#e=<issueId>`
  focus a finding card (replaceState + hashchange); send-for-approval gate
  mirrors the engine exactly (open HIGH findings block, mediums may ride);
  **dry-run panel is product-mode only** (absent in demo — no fake preview); it
  matches preview findings to stored ones by `(citation.clause, quote)`, never
  by preview ids, and states that it checks the *current* guideline version and
  persists nothing; the pinned-version chip is set in mono (machine truth).
- **Approvals page** — sign / return / export are role-gated (`permits`); the
  sign modal requires **typing the assigned approver's name** as recorded on the
  approval entry; only approver/admin see the buttons, per the engine matrix.
- **Dashboard** — stat formulas read stored state only (no invented counts);
  the Clarity Radar is captioned **"Illustrative — sample axes, not your data"**
  (the engine emits `ILLUSTRATIVE_RADAR` in both lanes).

### 15.4 Phase III — the information architecture

- Sidebar rebuilt into **Pipeline** (new review, reviews, approvals) +
  **Ground truth** (desk DNA, trust graph) groups; the lane chip reads the
  `engineError` state, so "Sample desk — demo data" vs "Live desk" is never a lie.
- New routes: `/app/reviews/new` (intake), `/app/dna` (knowledge base +
  clarity bars), **`/app/trust-graph`** (fetch with abort + demo fixture;
  per-node connections), **`/app/proposals` + `/app/proposals/[proposalId]`**
  (the sole ratify surface; the dashboard card links into it).
- Old `/app/intake` and `/app/guidelines` remain as client-side redirect stubs so
  no stale link dead-ends.

### 15.5 Phase IV — the identity flush

- **`permits.ts`** wired through approvals, issue cards, and proposals.
- Palette — **porcelain `#F5F6F4`** paper, **ink `#20282B`**, hairlines
  `#E2E6E3`/`#C9CFCB`; **teal `#17706B`** owns verification semantics
  (approved/verified, plus the red–amber pair `#B42318` / pencil for severity);
  citation blue stays `#2E5AAC`.
- Fonts — **IBM Plex Sans** (interface), **Plex Serif** (the reviewed copy — the
  document reader scans as a document, the tray as annotations), **Plex Mono**
  (machine truth: fact ids, pinned versions), Caveat kept for hand notes.
  Tailwind v4 `@theme` remaps `font-display/serif/mono/hand` in place.
- Wordmark: **Inkloom.** with sketch underline; sign-in lists the seeded seats
  and the demo code `0007` openly.

### 15.6 Verification (final gates + live smoke, both against yesterday's build)

| Check | Result |
|---|---|
| `tsc --noEmit` (after every phase + final) | **0 errors** |
| `eslint src` | **0 findings** |
| `next build` | **exit 0** — all 13 routes compile |
| engine `pytest -q` (re-run after all desk work) | **26 passed** — untouched confirmed |
| desk prod server (`next start -p 3119`) | **200** on `/`, `/signin`, `/app`, `/app/reviews/rv1`, `/app/trust-graph`, `/app/proposals` |
| engine login `priya@meridiancoffee.com` | creator token (247 chars), workspace **200 / 20 KB** — rv1–rv4, **exactly one `contradicted` finding** (seed parity confirmed live), `policyVersion: v2.3` |
| engine login `priya@brandproof.app` | **401** (see §15.7) — demo fallback takes over, labeled as demo |
| workspace with no token | **401** — fail-closed confirmed live |
| `GET /api/trust` | **200** end |

Final production build, zero errors:

| Route | Type | First Load JS |
|---|---|---|
| `/` · `/how-it-works` | ○ | 119 kB |
| `/signin` | ○ | 120 kB |
| `/app` | ○ | 136 kB |
| `/app/approvals` | ○ | 137 kB |
| `/app/dna` | ○ | 134 kB |
| `/app/guidelines` · `/app/intake` | ○ | 133 kB (redirect stubs) |
| `/app/proposals` · `/app/reviews` · `/app/reviews/new` · `/app/trust-graph` | ○ | 135–136 kB |
| `/app/proposals/[proposalId]` · `/app/reviews/[id]` | ƒ | 136 / 142 kB |
| Shared | | 124 kB |

### 15.7 Bugs caught by the smoke pass

1. **Sign-in copy claimed the wrong seat domain** — the identity flush listed
   `priya@, ravi@, maya@, admin@brandproof.app`, but the engine seeds three of
   the four as `@meridiancoffee.com` (`admin@brandproof.app` is correct). A
   judge typing `priya@brandproof.app` would get a 401 and silently land in
   demo mode believing they were live. Fixed **the copy**, not the engine
   (engine untouched is a hard contract): seats are now shown as
   `priya@, ravi@, maya@meridiancoffee.com · admin@brandproof.app`. Re-gated
   (tsc/lint/build all green) and rebuilt.
2. A stray `.dialog-shadow, .stamp {}` junk line slipped into `globals.css`
   during the token retune — caught by reading the diff back, removed.

### 15.8 Deliberately left open

- The **judge-path click-through** (paste copy → findings → open an evidence
  drawer → apply a suggestion → sign) was verified at the API boundary and by
  endpoint, not with a live browser session — the endpoints above answer, and
  the client logic is the same one the demo state machine exercises.
- Design-token persistence via the `ui-ux-pro` skill (`--persist`) was
  skipped: optional, and any `--force` over an existing `MASTER.md` requires
  explicit authorization. The living source of tokens remains `globals.css`.
- `next build` warnings review, apple-touch icon, and Vercel deploy remain
  outside this phase's scope.


---

## 16. Design polish pass via the super-design skill (2026-10-27)

> Ran the `super-design` skill (landing-page-design + design-to-motion rules)
> against the desk, judged deal-by-deal with the contract in §15.1. The skill's
> defaults that fight the accepted identity were **declined** (Geist/Manrope
> typefaces, one-font-per-site rule, colored icon sets — IBM Plex, lucide, and
> the porcelain tokens stand). Everything craft-level was adopted.

### 16.1 Landing page (restructured to the skill's conversion shape)

- Section order now matches A2: hero → proof signal (the seed-fixture flag
  card, labeled "on the desk") → **tagline reveal** (new B11 section) → three
  improvements → why-it-exists → **FAQ** (new, 4 honest Qs: real app vs mockup,
  the AI never approves or applies alone, data stays local, what runs
  automatically) → **final CTA** (new, same one offer) → footer.
- Hero caps: heading and subheading both at **680px**, sentence breaks kept
  meaningful; heading colors are the skill's one text gradient cast in identity
  ink (`#20282B → #5A6470`, background stays flat).
- Typography snapped to the Tailwind scale on the landing only: `text-4xl/
  md:text-6xl` hero, `text-2xl` section heads (was 26px/22px inconsistent —
  also a rhythm win), `text-base/sm` bodies; bugfix prices ("0.87 confidence"
  → "Analysis confidence 87%" — the label the product actually uses).
- Copy realism: every "BrandProof" string on the page replaced with Inkloom
  (wordmark component is now the single name source); no banned filler words;
  CTAs are verb-plus-what-you-get; secondary hero link demoted to a quiet text
  link so one primary action stays unmistakable.

### 16.2 Motion system (one curve, transform + opacity only)

- Base curve `cubic-bezier(0.22, 1, 0.36, 1)` in `globals.css` (`--ease-settle`);
  `@keyframes rise-in` for the **hero appear** (6px rise + 2px blur, ~60ms
  stagger, once on load); `.reveal` for **scroll arrival** (32px rise + fade,
  700ms, `IntersectionObserver` at 30% visibility, plays once); `.tagword`
  for the **tagline activation** (words go 30% → 100% ink as each crosses a
  trigger line via a per-word shared observer, reading order — the sentence
  weaves itself, matching the name).
- New client primitives in `components/motion.tsx` — `Reveal`, `Tagline`; the
  sentence stays whole for screen readers (`aria-label`) and the colored words
  are `aria-hidden`.
- Reduced motion: existing global guard extended — reveals and taglines render
  their **final state** with no movement; a `<noscript>` style does the same
  if scripting never runs (content is never stuck hidden, even then).
- The product surfaces keep the brief's "motion answers actions only": pages
  got *no* storytelling; the interactive states got the curve (buttons in
  `ui/button.tsx` now settle on a 200ms `--ease-settle` transition, hover
  lightens via token (`bg-ink/85`, no more off-palette `#2A3A59` navy), press
  lands with `active:scale-[0.98]`).

### 16.3 Ship requirements (B10) and truth repairs

- **Branded 404** (`not-found.tsx`): "This page was never proved." + the empty
  state speaks for itself ("the paper is blank for a reason.").
- **Branded favicon** (`icon.svg`, porcelain tile + ink thread + redpen wash)
  replacing the scaffold `favicon.ico`.
- **Skip-to-content link** in the root layout; `<main id="app-main">` targets
  added to the landing and the app shell (the shell's content wrapper became a
  real `<main>` — semantic HTML win along the way).
- **OG tags + theme color** added to metadata.
- **Disclosure page truthfulness**: `/how-it-works` still claimed the Phase 2
  state ("frontend-only build", "no backend", "role switching (demo)") — all
  corrected to the two-lane truth: engine lane (real deterministic checks +
  retrieval + verification anchors), sample lane (labeled fixtures), and the
  trained-model pass named honestly as the next layer. Title metadata now says
  Inkloom.
- FAQ / landing answers restate only §15-verified facts — no new numbers
  invented for marketing.

### 16.4 Gates + the deliberate leftovers

| Check | Result |
|---|---|
| `tsc --noEmit`, `eslint src` | **0 / 0** |
| `next build` | exit 0, all routes; `icon.svg` + branded 404 in the manifest |
| SSR check of prerendered HTML | Inkloom wordmark + skip-link + motion classes all server-rendered; honest 404 HTML present |
| engine untouched | no `engine/` file touched (pytest's §15.6 result still stands) |

**Left open**: the skill's floating-navbar pattern (a document app's left rail
is intentional), full type-scale snapping *inside* the product surfaces (12–16px
pinpoint sizes are the product's measured instrument set — the scale governs
marketing pages), and the design-to-motion showcase exports (MP4/GIF video —
none was requested). These are stated decisions, not omissions.


---

*Logged by the build agent (OpenCode + GLM, 2026-10-26). The workspace demo, the
disclosure page, and this log are consistent with each other by design — if the
judges ask, the answer is on the page.*
