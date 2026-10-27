# Inkloom AI Frontend — Evolving `desk/` into the Spec

* **Author:** Himanshu Solanki / Inkloom build team
* **Date:** 2026-10-26
* **Mode:** EGM brainstorm — reviewed by 6 Goldfish lenses (design, codebase-details, zoom-out, comprehension, implementation-readiness, structural). All factual claims in this brief were verified against `engine/app/**` and `desk/src/**`. Engine untouched: pytest 26 green, mypy strict clean, ruff clean, smoke suite green.

---

## Overview

Inkloom AI (the BrandProof engine's product identity for the Inkloom brand-governance challenge) needs its frontend to match the spec in `inkloom_ai_frontend_complete.md`. The engine already implements the entire review loop server-side. The work is therefore **not a new app and not a backend push**: it is evolving `desk/` (Next.js 15 App Router, React 19, Tailwind 4 — *not* "Next 14" as earlier assumed) into the spec's information architecture, with a sharp honesty standard: every number, finding, citation, and approval state on screen is server-authoritative; anything not backed by the engine is either clearly labeled (illustrative / sample / dry-run) or not shown at all.

Target user: a hackathon judge. Success criterion (fixed by product owner): *a judge can submit content, see real brand-policy findings and evidence, understand a suggested correction, and complete the supported review/approval flow without encountering fake functionality.*

---

## Analysis

### A. Verified engine surface (audit)

All routes under `/api` (FastAPI, `engine/app/api/routes/`):

| Endpoint | Purpose | Auth gate |
|---|---|---|
| `POST /auth/login`, `GET /auth/me` | Session | public → bearer |
| `GET /workspace` | Full hydration snapshot: user, brand, guidelines(+clarity), facts, terms, assets, reviews, approvals, amendments, radar, engineInfo | all roles |
| `POST /reviews/analyze` | Submit draft → persisted review + issues | all roles |
| `POST /reviews/checks/preview` | **Dry-run** checks on flat pasted text; no persistence, **unused by desk today** | all roles |
| `GET /reviews/{id}` | Review + issues | RBAC |
| `POST /reviews/{id}/issues/{iid}/resolve\|dismiss\|reopen` | Issue decisions | RBAC (creator cannot dismiss) |
| `POST /reviews/{id}/send-for-approval` | Risk gate: 409 `route.escalate` on undecided HIGH findings | creator+ |
| `GET/POST /approvals/{id}/sign\|return`, `GET .../manifest.pdf` | Approvals + deterministic signed PDF | sign/return: approver/admin; export: reviewer+ |
| `GET /proposals`, `POST /proposals/{id}/ratify` | Learning proposals; ratify bumps guideline version → `v2.4-draft` | ratify: approver/admin |
| `GET /trust` | Real graph. **Emitted** kinds: review, issue, rule, evidence, decision, audit (last 8 org events, no edges, no timestamps); rels: `has_finding`, `cites`, `backed_by`, `decision_for` | all roles (VIEW_TRUST_GRAPH) |
| `GET /admin/conflicts` | Deterministic policy-conflict output (Policy Conflict Center data) | reviewer+ (creator 403s) |
| `GET /health`, `GET /admin/users` (+role POST) | Health / user admin (defer) | admin |

Key wire facts the desk currently **casts away**: `Issue.evidenceIds`, `Issue.verification` (supported|contradicted|unverified|inconclusive), `Issue.agent`, `Review.policyVersion` are on the wire today but absent from `desk/src/lib/types.ts`.

### B. What desk already covers vs. the spec

Six of the ten spec nav items already have working surfaces: dashboard, intake→analyze, review workspace with inline marks + issue cards + resolve/dismiss/reopen + send-for-approval, approvals (sign/return, governed 403, manifest PDF), knowledge base (guidelines/facts/terms/assets + version banner), plus ratify wired from dashboard and guidelines. The genuinely missing surfaces: Trust Graph screen (one new client fetch), a Proposals list/detail page (currently amendments live inside two other screens with two separate ratify buttons), finding-detail enrichment (verification + evidence join), and role-gated action visibility.

### C. Deduplicated Goldfish findings

**C1. The one real hole in "zero backend changes" — recheck.** Unanimous blocker. Truth: `resolve(replacement)` mutates only the issue row (no `ContentVersion` is ever incremented; every version row is `ordinal=1`); `checks/preview` takes flat text against the *latest* guideline version, not the review's pinned `policy_version`, and persists nothing; re-`analyze` forks a sibling review with no lineage edges. Resolution adopted in this brief: **Desk-only honest loop now** — (1) "Preview checks" button per finding/editor → `checks/preview`, rendered in a visibly quarantined "dry run — not saved" panel, matched to the revised text by `(citation.clause, quote)` content pairs, never by preview ids; (2) "Submit revised draft" → new review via `analyze` (title convention `(rev 2)`), original untouched. The **versioned recheck endpoint** (`POST /reviews/{id}/recheck` cutting `ContentVersion` ordinal n+1 with lineage edges) is written down as an explicit deferred engine ticket, not silently assumed. Spec §21's "recheck results" is served by the dry-run honestly labeled.

**C2. Fabrication seams inside today's desk (must be killed, not refined):**
- Radar caption says "measured from real review cycles" while the engine ships `ILLUSTRATIVE_RADAR` (its own code comment *mandates the desk label it*). Fix: "Illustrative — sample axes, not your data," both lanes, or drop the card.
- `snapshotToState` spreads `seedState` beneath engine fields: any empty/missing field silently revives demo content. Fix: strict hydrate — empty → §14 empty state, error → error state. No invisible fallback.
- Unknown review status renders as benign "In review" (`pills.tsx:42`); spec §10 forbids unknown masquerading as approved-adjacent. Fix: neutral `Status: {raw}` pill.
- Approver hard-coded "Maya Okafor" in six places; engine assigns approver-then-admin and the sign modal's typed name is discarded anyway. Fix: bind all name references to `ApprovalEntry.approver` / session user; signature modal pre-fills the signed-in user and says which seat they're acting in.
- Demo-lane metrics (radar 42/58/64/38/71, counters over fixtures) present as measured. Fix: visible **"sample data"** chip on every fixture-derived number in demo lane; live numbers un-tagged so the contrast teaches what's real.

**C3. Comprehension/vocabulary (naive-judge pass):**
- One object, three nouns ("finding"/"issue"/"flag"). Canonical user-facing noun in this brief: **finding** — "issue" stays internal API vocabulary.
- Issue actions rewritten: "Accept" → **"Keep line as-is"** (with "overrule this flag — the reason goes on the approval record"); "Edit" → **"Rewrite this line."** After keeping, the suggestion must stop rendering as if applied.
- Review pill `changes_requested` → **"Sent back for fixes."**
- Verification needs a permanent legend: Supported / Contradicted / Unverified / Inconclusive, one line each; the chip links to the fact row that drove it; "unverified ≠ false" is stated once, visibly.
- `sure 0.87` → **"Analysis confidence 87%"** + one-line gloss; state once that confidence ≠ verification.
- "Manifest" → user-facing **"approval record (PDF)"**; "engine" → **"the review service"** in all user copy.
- Demo lane needs a persistent, unmissable mode chip: **"Sample desk — demo data"** (amber) vs **"Live desk — connected to the review service"** (green), beside the wordmark on every screen. Sign-in screen states the two-lane fork explicitly. Engine login failure never silent: "Couldn't reach the review service — continuing with the offline sample desk."
- Product-only surfaces (Trust Graph, approval-record PDF, governed sign) in demo mode show a labeled capability gate — never synthetic stand-in data. Dual-mode policy in one sentence: *demo lane renders only what seed state can honestly produce; anything product-only shows a mode gate.*

**C4. Role gating (biggest live-demo embarrassment risk).** Desk renders dismiss/sign/ratify to everyone; the engine 403s creators on dismiss/ratify/manifest and reviewers on sign/ratify. Fix: client-side RBAC matrix bound to `session.user.role` — Dismiss: reviewer+; Send-for-approval: creator+; Sign/Return: approver/admin; approval-record export: reviewer+; Ratify: approver/admin; conflicts card: reviewer+; always render send-for-approval with its gate reason as the disabled label ("decide all 2 findings first").

**C5. IA / route map (structural lens, deviations from spec §4 defended):**

```text
/                     marketing (rebrand to Inkloom)
├── signin            two-lane fork stated on-screen
├── how-it-works      explainer + "planned, not in this build" section
└── app/
    ├── page.tsx              Dashboard (counts + links; no mutation)
    ├── reviews/page.tsx      Reviews list
    ├── reviews/new/          New review (moves /app/intake; kills orphan route)
    ├── reviews/[id]/         ONE workspace page, anchored: #f=<findingId>, #e=<findingId>
    ├── approvals/page.tsx    Approvals queue (decision modal, no sub-route)
    ├── dna/page.tsx          Brand DNA (read view; guidelines restructured; proposals NOT here)
    ├── trust-graph/page.tsx          table/list explorer (mandatory accessibility alt.)
    └── trust-graph/[entityId]/       anchored node; type-prefixed ids (review:, rule:, claim:)
    └── proposals/page.tsx    Learning Proposals list
        └── [proposalId]/     detail — the ONE ratify surface
```

Sidebar: two groups of three — *Pipeline* (Dashboard / Reviews / Approvals) and *Ground truth* (Brand DNA / Trust Graph / Learning Proposals); footer: seat + how-it-works. Deferred items (Simulator, Drift, Settings) never ship as dead links: separate non-clickable group "Planned — not in this build" with one-line tooltips, or simply excluded from nav with an explanation on how-it-works. Single brand on the wire → collapsing `brands/[brandId]` to one `/app/dna` is a spec-bug fix, not a deviation.

**C6. Identity (design × zoom-out reconciliation).** Zoom-out is right that the full component rebuild is the worst cost/benefit and the proofing-desk concept — documents rendered as documents, hand-written uncertainty notes, stamps — is the product's best differentiator and stays. Design lens retires the warm-cream/terracotta world in favor of a **cool "drafting-room" token layer, edited in `globals.css` only**: porcelain surface (`#F5F6F4`), panel white, ink `#20282B`, hairline `#E2E6E3`, a single semantic teal (`#17706B`) reserved for verification/evidence semantics, cold red `#B42318` + amber for severity only — never brand voice; severity tiers also encode by position + notch shape (color never alone). Three type registers: serif for reviewed copy (quoted matter reads as quotation), sans for interface language, mono for machine truth (versions, confidence, clause keys, finding ids). The one memorable structural idea: the **finding ledger spine** — a right rail of ledger rows (severity notch + verification glyph + clause key), each selection moving the whole system at once: document highlight + evidence drawer opened from the same row; selected index repeats in every surface. Mobile tabs mirror the desktop panels 1:1 (Content / Findings / Proof). No shadcn/Radix layer, no chart library. Wordmark: Inkloom.

**C7. State discipline (implementation-readiness).** Second-layer read screens (trust, proposals) stay **out of the store**: fresh client components doing their own fetch into `useState` with skeleton/empty/error states and abort-on-unmount; `ratify` remains the one store-path mutation. Do not new `DemoState` fields the snapshot doesn't return (that mechanism silently reverted `engineInfo` today). Expose one small shared `read(fn)` busy/error helper instead of a second divergent pattern. Audit history has no endpoint — display scope pinned to: manifest PDF (signed approvals), current issue status + reason + replacement, approval entries, `policyVersion`, and Trust Graph's "last eight recorded events" section (labeled, no timestamps faked). Richer timelines are an engine ticket.

### D. Screen-by-screen matrix (owner-demanded)

| Screen | Engine backing | Status | Backend additions | Demo priority |
|---|---|---|---|---|
| Sign-in | `/auth/login`, `/auth/me` | Live | none | P0 |
| Dashboard | `/workspace` (derivable formulas only) | Partial (radar relabeled illustrative; conflicts card reviewer+) | none | P0 |
| New review | `/reviews/analyze` | Live | none | P0 |
| Reviews list | snapshot | Live | none | P0 |
| Review workspace | snapshot; resolve/dismiss/reopen; send-for-approval | **Partial → P0 deepening**: verification + evidenceIds join, role-gated actions, hash anchors, ledger spine | none | P0 |
| Finding detail | issue fields on wire (must be added to desk types) | Partial | none | P0 |
| Recheck | `/reviews/checks/preview` + re-`analyze` | Partial (honest two-mode) | **deferred ticket**: `POST /reviews/{id}/recheck` | P0 |
| Approvals | sign/return/manifest.pdf | Live | none | P0 |
| Learning Proposals | `/proposals` + ratify | Live (new page; single write surface) | none | P1 |
| Trust Graph | `/trust` (actual emitted schema) | Live | none | P1 |
| Brand DNA | snapshot (guidelines/facts/terms/assets) | Partial (read view; no editors) | none | P1 |
| Policy Conflict Center | `/admin/conflicts` | Partial (dashboard card, reviewer+) | none | P1 |
| Drift radar | illustrative radar only | Deferred (real trends = engine ticket) | — | P2 |
| Policy Simulator | none | Deferred, labeled roadmap | — | — |
| Settings/onboarding | `/admin/users` (users mgmt deferred) | Deferred | — | — |
| File/image uploads | not supported (analyze takes text sections only) | Deferred — honestly absent, not hidden | — | — |

---

## Goals vs. Non-Goals

**In-scope goals**
1. Core loop end-to-end, server-authoritative, zero fabricated data: sign-in → new review → workspace → findings with citation/verification/evidence → correction (keep-line / rewrite) → preview dry-run → revised draft as new review → risk-gated send → approval sign/return → approval-record PDF.
2. Honesty system: mode chip, sample-data chips, illustrative labels, dry-run quarantine, neutral unknown-status pill, empty/error/partial states per §14, permission-aware controls.
3. Second layer from live data: Proposals (list + detail, single ratify), Trust Graph (list explorer + anchored node), Brand DNA read view, conflicts card.
4. IA rebuild: route map above, intake orphan repair, hash anchors, ledger spine workspace, mobile tab parity.
5. Inkloom identity: token retune in `globals.css` (palette/registers/wordmark), component inventory preserved; design-system pass persisted via `ui-ux-pro` after Goldfish sign-off on tokens.
6. Minimal test set protecting the two invariants (engine-down labeling; server-authoritative rendering incl. unknown status and role gating); `$pytest` engine suite stays green.

**Out-of-scope non-goals (explicitly, not silently):** file/image uploads; policy simulator; real drift analytics; settings/members/audit-log screens;CMS integrations; onboarding; versioned-recheck *engine* endpoint (ticketed, not assumed); Radix/shadcn adoption; a store rewrite; any UI that implies measured accuracy.

---

## Key Decisions & Staging for Next Steps

1. **Recheck = dry-run preview (quarantined) + revised-draft-as-new-review;** versioned recheck ticketed. This is the only place the "zero backend additions" bet was bent, and it is resolved desk-side.
2. **Types-first Phase 1:** extend `types.ts` with `evidenceIds/verification/agent/policyVersion` + trust/proposal types (pinned to *actual* emitted schema), add `api.trust()/proposals()/checksPreview()`, strict hydrate (kill seedState spread). Demo seed gains parity fields.
3. **Role-gating matrix** bound to session role; approver identity from data, never constants.
4. **Route map + hash anchors as in §C5;** intake → `/app/reviews/new`; the single-page workspace with ledger spine; one-page-per-entity symmetry; proposals detail as only ratify surface.
5. **Vocabulary table** (§C3) implemented as a copy pass with permanent verification legend and gate-reason labels on disabled actions.
6. **Identity execution order:** tokens refined inside one real finding row + one real approval action (the ledger spine) before any other surface is styled — the Goldfish sequencing counter-argument is adopted.
7. **Build order:** Phase 0 gates green → Phase 1 data floor (types/api/strict hydrate) → Phase 2 P0 loop deepening → Phase 3 second layer + honest dashboard → Phase 4 minimal tests + docs. Every phase: `tsc --noEmit`, lint, `next build`, engine pytest untouched.
8. **Top objections carried forward** (see §C1, C2, C4, C6) — resolved as above in this brief; user may overturn at handoff.

---

## Risks

- **Spark risk:** touching engine for recheck was rejected *this round*; if a judge demands version lineage visibly, the ticket becomes P1 — decide that at the gate, not mid-build.
- **Conflicts 403 trap:** any creator session hitting the conflicts card trips a red banner; card is reviewer+-gated.
- **Trust graph schema drift:** renderer must tolerate unknown kinds/rels additive-safely (contract comments × emitted reality disagree).
- **Demo-lane leakage:** the single biggest integrity risk; the one-sentence dual-mode policy in §C3 is the control line, and Phase 4 tests pin it.
