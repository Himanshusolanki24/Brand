# Inkloom AI — Complete Frontend Specification

> **Purpose:** High-level product and engineering guide for building the Inkloom AI frontend. This document defines the UI/UX direction, routes, screens, component system, frontend architecture, API integration, state, security, accessibility, testing, and delivery priorities.
>
> **Product:** A multi-agent brand-governance platform that checks content against approved brand rules, evidence, terminology, policies, and visual assets; explains findings; suggests corrections; routes risky decisions to humans; and improves through controlled feedback.

---

## 1. Product Vision

Inkloom AI is not just an AI dashboard. Its frontend should make content-governance decisions **understandable, traceable, actionable, and accountable**.

For every important finding, users should be able to answer:

- What was flagged?
- Which exact content is involved?
- Which approved rule applies?
- What evidence supports the finding?
- What remains uncertain?
- What correction is recommended?
- Who needs to approve the result?
- Which content and policy versions were evaluated?
- What changed, and can the decision be audited?

### Product layers

1. **Prevent:** Brand DNA, approved claims, policy checks, terminology, tone, and visual checks.
2. **Resolve:** Explainable findings, evidence, minimal corrections, rechecks, human approval, and audit history.
3. **Improve:** Controlled learning, Brand Drift Radar, What-If Simulator, Governance Digital Twin, and Inkloom Trust Graph.

### Core principles

- Evidence before assertion.
- Explicit uncertainty: missing evidence does not prove a claim false.
- Human accountability for high-risk or ambiguous decisions.
- Versioned policies and content.
- Controlled, approval-gated learning.
- Honest metrics based on real evaluations.
- Privacy and organisation-level data isolation.

---

## 2. Recommended Frontend Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js App Router + React + TypeScript | Routing, layouts, typed UI, server/client component separation. |
| Styling | Tailwind CSS | Consistent and maintainable styling. |
| UI primitives | shadcn/ui + Radix UI | Accessible dialogs, menus, tabs, forms, and tooltips. |
| Icons | Lucide React | Consistent icon system. |
| Forms | React Hook Form + Zod | Form state and client-side validation. Server validation remains authoritative. |
| API/server state | Typed fetch wrapper; TanStack Query where useful | Requests, caching, loading states, retries, and invalidation. |
| Local UI state | React state/context | Keep state simple; add a global store only if needed. |
| Tables | TanStack Table when required | Filtering, sorting, pagination, and configurable columns. |
| Charts | Recharts | Governance and review analytics. |
| Graph view | React Flow only if interactive graph navigation is useful | Explore relationships between content, claims, rules, evidence, and decisions. |
| Rich-text editing | TipTap or a scoped editor | Corrections and inline annotations. |
| Text diff | Diff library or custom diff component | Compare original and revised content. |
| Unit/component tests | Vitest + React Testing Library | Test logic and components. |
| End-to-end tests | Playwright | Test complete user journeys. |
| Accessibility checks | axe-core plus manual testing | Catch common accessibility defects. |
| Error monitoring | Sentry or equivalent | Diagnose failures with privacy-safe telemetry. |
| Deployment | Vercel or equivalent | Host the Next.js frontend. |

**Keep the stack lean.** Avoid adding Redux, Zustand, several UI libraries, and multiple chart libraries without a concrete need. Use a query library for API state, React state for local interactions, and a form library for complex forms.

---

## 3. Visual Direction

### Desired look

A calm, precise, premium enterprise interface. Avoid generic AI visuals such as excessive gradients, glowing orbs, glassmorphism, and decorative animations that compete with the content.

### Suggested design tokens

- Background: warm near-white or very light cool grey.
- Main text: deep navy or charcoal.
- Primary accent: restrained violet/indigo.
- Secondary accent: muted teal for evidence and informational states.
- Success: accessible green.
- Warning: amber.
- Critical: red, reserved for genuinely blocking issues.
- Borders: light neutral grey.
- Typography: Inter, Geist, or another legible sans-serif.
- Cards: clear surfaces, subtle borders, restrained shadows.
- Motion: short, purposeful transitions; respect reduced-motion preferences.

These are proposed defaults, not confirmed brand requirements. Validate the visual system with a small design exploration.

### Hierarchy

1. Current review status and next action.
2. Most consequential findings.
3. Evidence and applicable policy.
4. Correction and approval controls.
5. Historical context and analytics.

Never communicate status by colour alone. Pair colour with a text label and, when useful, an icon.

---

## 4. Information Architecture

### Main navigation

- Dashboard
- Reviews
- Brands
- Brand DNA
- Trust Graph
- Approvals
- Brand Drift
- Policy Simulator
- Learning Proposals
- Settings

Show only features the current user is allowed to access. Hide unfinished advanced features or mark them as beta.

### Route map

```text
/
├── login
├── onboarding
├── dashboard
├── reviews/
│   ├── new
│   └── [reviewId]/
│       ├── findings
│       ├── evidence
│       ├── changes
│       └── history
├── brands/
│   ├── new
│   └── [brandId]/
│       ├── overview
│       ├── dna
│       ├── rules
│       ├── claims
│       ├── assets
│       ├── knowledge
│       └── versions
├── trust-graph/[entityId]
├── approvals/[approvalId]
├── brand-drift
├── policy-simulator
├── learning-proposals/[proposalId]
├── settings/
│   ├── profile
│   ├── organization
│   ├── members
│   ├── integrations
│   ├── security
│   └── audit-log
└── access-denied
```

### Suggested roles

- **Owner/Admin:** Organisation, members, policies, integrations, and approval settings.
- **Brand Manager:** Brand DNA, rules, claims, assets, and learning proposals.
- **Reviewer:** Review content, inspect evidence, suggest corrections, and decide findings.
- **Contributor:** Submit content and respond to findings.
- **Auditor/Read-only:** Inspect permitted reviews, evidence, versions, and audit history.

These are proposed roles. Backend authorisation is authoritative. Hiding a button in the frontend is not a security boundary.

---

## 5. Core Screens and Requirements

### 5.1 Dashboard

Include:
- Active brand/workspace selector.
- Primary **Start a review** action.
- Reviews awaiting human decisions.
- High-risk items on hold.
- Recent reviews and outcomes.
- Most frequent violation categories.
- Unresolved policy conflicts.
- Pending learning proposals.
- Recent rule or approved-claim changes.
- Review volume, correction acceptance, and review-time trends where real data exists.

Use real API data. Define loading, empty, error, and partial-data states. Do not present hard-coded sample numbers as production metrics.

### 5.2 New Review

Support only formats the backend can process, such as pasted text, supported documents, and images.

Possible fields:
- Brand.
- Content type and channel.
- Market and language.
- Campaign or product context.
- File/text input.
- Policy version, where permitted.
- Privacy and processing notice.

Show supported file formats and size limits. Validate in the browser and again on the server.

### 5.3 Review Workspace — The Most Important Screen

Suggested desktop layout:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Review title | Brand | Versions | Status | Save / Export        │
├──────────────────┬───────────────────────┬──────────────────────┤
│ FINDINGS         │ CONTENT               │ EVIDENCE & POLICY    │
│                  │                       │                      │
│ Severity/status  │ Original/revised text │ Applicable rule      │
│ Finding list     │ Inline annotations    │ Source passages     │
│ Search/filters   │ Content diff          │ Source date/scope    │
│                  │                       │ Uncertainty          │
├──────────────────┴───────────────────────┴──────────────────────┤
│ Correction | Apply | Reject | Recheck | Request review           │
└─────────────────────────────────────────────────────────────────┘
```

On smaller screens, use tabs or stacked panels rather than compressing all columns.

Each finding should show:
- Severity and status.
- Plain-language title.
- Exact text excerpt or visual region.
- Applicable rule and version.
- Evidence references, if available.
- Explanation and uncertainty.
- Recommended action.
- Correction status.
- Decision history.

### 5.4 Finding Detail Panel

Separate the concepts:
- **Finding:** What the system detected.
- **Rule:** The approved requirement.
- **Evidence:** Source material relevant to the finding.
- **Assessment:** Why the finding may apply.
- **Uncertainty:** What the available material does not establish.
- **Action:** What the user can do next.

Do not expose private internal chain-of-thought. Provide concise user-facing reasons, verifiable evidence, applicable policies, and limitations.

### 5.5 Correction Editor

Include:
- Original and proposed text.
- Word-level or line-level diff.
- Accept/reject controls.
- Manual editing.
- Explanation of the change.
- Recheck button.
- Remaining findings.
- Version history.

Never silently overwrite the original content. Save a new version.

### 5.6 Evidence Explorer

Show:
- Source title and type.
- Approved/unapproved status.
- Product, market, and language scope.
- Validity dates where available.
- Exact relevant passage.
- Source link if permitted.
- Claim-to-evidence relationship.
- Freshness or review status.
- Why the source is relevant.

Distinguish **supported**, **contradicted**, **unverified**, and **inconclusive**. Do not label a source authoritative unless the organisation has approved it for that purpose.

### 5.7 Brand DNA Workspace

Sections:
- Overview.
- Voice and tone.
- Terminology.
- Approved claims.
- Required disclaimers.
- Policies and restrictions.
- Visual assets.
- Markets and languages.
- Source documents.
- Version history.

Rules should show owner, scope, status, source, version, and effective dates where available. AI-extracted rules must remain drafts until an authorised person approves them.

### 5.8 Policy Conflict Center

Show:
- Potentially conflicting or ambiguous rules.
- Exact policy passages.
- Rule owners and versions.
- Scope differences.
- Why the conflict matters.
- Suggested questions or possible resolutions.
- Assignment to a policy owner.
- Resolution history.

Label issues as *potential conflicts* until an authorised owner resolves them.

### 5.9 Inkloom Trust Graph

Connect:

```text
Content Version
  ├── Claim
  │   ├── Supporting Evidence
  │   └── Contradicting Evidence
  ├── Applicable Rule + Rule Version
  ├── Finding
  ├── Correction
  └── Human Decision / Approval
```

Requirements:
- Click a node to inspect details.
- Filter by relationship type.
- Show source/version metadata.
- Highlight missing or outdated links.
- Provide a table/list alternative for accessibility and large graphs.

Start with a simple relationship explorer. Add an interactive graph only when it helps real tasks.

### 5.10 Brand Drift Radar

Show actual stored trends:
- Frequently flagged rules.
- Violations by content type or team, subject to permissions.
- Recurring correction patterns.
- Unresolved issues.
- Trends before and after policy changes.
- Content potentially affected by changed claims or assets.

Include date range, sample size, metric definition, and data freshness. Do not infer causation from correlation or expose individual employee rankings without an explicit, justified requirement.

### 5.11 What-If Policy Simulator

Allow authorised users to:
1. Select a current rule.
2. Create a draft version.
3. Preview the change.
4. Test the candidate against historical or labelled content.
5. Compare old and proposed outcomes.
6. Inspect newly flagged and no-longer-flagged examples.
7. Review evaluation metrics.
8. Submit the candidate for approval.

Clearly label results as evaluation on a particular dataset/version, not a guarantee of future behaviour.

### 5.12 Learning Proposals

Show:
- Proposal summary.
- Source feedback and frequency.
- Affected rule or workflow.
- Candidate change.
- Example cases.
- Regression results.
- Expected risks and limitations.
- Approve, reject, or request changes.
- Version created after approval.

A proposal must not appear as an active rule until the backend confirms approval and activation.

### 5.13 Approvals Queue

Include:
- Pending items.
- Risk level and reason.
- Required reviewer role.
- Due date if configured.
- Evidence and policy links.
- Approve, reject, return for changes, or escalate.
- Decision comments where required.
- Audit history.

Use clear action labels and confirmation for consequential decisions.

### 5.14 Settings and Audit Log

Settings can include profile, organisation, members, roles, approval policies, integrations, retention, notifications, and security. Audit events should show actor, action, time, affected entity, and version without exposing secrets or unnecessary personal data.

---

## 6. Reusable Component System

```text
components/
├── layout/
│   ├── AppShell
│   ├── Sidebar
│   ├── TopBar
│   ├── Breadcrumbs
│   └── MobileNavigation
├── ui/
│   ├── Button
│   ├── Badge
│   ├── Card
│   ├── Dialog
│   ├── Drawer
│   ├── Tooltip
│   ├── Tabs
│   ├── Table
│   ├── Skeleton
│   ├── EmptyState
│   ├── ErrorState
│   └── ConfirmActionDialog
├── review/
│   ├── ReviewHeader
│   ├── ReviewStatus
│   ├── ReviewSummary
│   ├── FindingList
│   ├── FindingCard
│   ├── FindingFilters
│   ├── InlineAnnotation
│   ├── CorrectionEditor
│   ├── ContentDiff
│   └── ReviewTimeline
├── evidence/
│   ├── EvidencePanel
│   ├── EvidenceCard
│   ├── SourceMetadata
│   ├── ClaimEvidenceLinks
│   └── UncertaintyNotice
├── brand/
│   ├── BrandSelector
│   ├── BrandDnaSummary
│   ├── RuleEditor
│   ├── RuleVersionHistory
│   ├── ClaimRegistry
│   └── AssetLibrary
├── governance/
│   ├── PolicyConflictCard
│   ├── ApprovalQueue
│   ├── ApprovalDecisionDialog
│   ├── LearningProposalCard
│   ├── TrustGraphPanel
│   └── RiskSummary
└── analytics/
    ├── MetricCard
    ├── TrendChart
    ├── ViolationBreakdown
    └── DataFreshnessLabel
```

Create shared components for repeated patterns or meaningful product concepts. Avoid overengineering abstractions for trivial markup.

---

## 7. Suggested Next.js Project Structure

```text
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── onboarding/
│   │   ├── (workspace)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── reviews/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   └── [reviewId]/
│   │   │   ├── brands/
│   │   │   ├── trust-graph/
│   │   │   ├── approvals/
│   │   │   ├── brand-drift/
│   │   │   ├── policy-simulator/
│   │   │   ├── learning-proposals/
│   │   │   └── settings/
│   │   ├── api/                 # Only for deliberate BFF routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── reviews/
│   │   ├── brands/
│   │   ├── evidence/
│   │   ├── approvals/
│   │   ├── trust-graph/
│   │   ├── learning/
│   │   └── analytics/
│   ├── hooks/
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   ├── env.ts
│   │   ├── errors.ts
│   │   ├── permissions.ts
│   │   └── utils.ts
│   ├── schemas/
│   ├── types/
│   └── test/
├── .env.example
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

Create files as the corresponding feature is implemented rather than scaffolding the entire tree at the start.

---

## 8. Frontend Architecture and Data Flow

```text
Browser / Next.js UI
       |
       v
Authentication + Workspace Context
       |
       v
Typed API Client
       |
       v
FastAPI Backend
       |
       v
Review Workflow / Agent Orchestrator
       |
       +--> Brand Rules
       +--> Evidence Retrieval
       +--> Visual Checks
       +--> Critic / Validation
       +--> Corrections
       |
       v
Structured Review Result
       |
       v
Review Workspace
       +--> Findings
       +--> Evidence
       +--> Corrections / Diff
       +--> Approval Actions
       +--> Audit History
```

The frontend displays the backend's validated state. It must not invent an approval, activate a learning proposal, or mark a failed check as passed based only on client state.

### Server/client components

- Prefer Server Components for static page structure and suitable server-side data reads.
- Use Client Components for interactive editors, filters, dialogs, uploads, and browser APIs.
- Never put secrets in client-exposed environment variables.
- Dynamically load heavy graph/editor features where appropriate.

---

## 9. API Integration Contract

The following endpoints are **suggested contracts**, not confirmed existing endpoints. Align them with the actual FastAPI implementation.

| Method | Suggested endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/me` | Current user and workspace. |
| `GET` | `/api/v1/brands` | List accessible brands. |
| `POST` | `/api/v1/brands` | Create a brand. |
| `GET` | `/api/v1/brands/{brandId}` | Get brand details. |
| `GET` | `/api/v1/brands/{brandId}/rules` | List approved rules. |
| `POST` | `/api/v1/brands/{brandId}/documents` | Upload a document. |
| `POST` | `/api/v1/reviews` | Create a review. |
| `GET` | `/api/v1/reviews` | List reviews. |
| `GET` | `/api/v1/reviews/{reviewId}` | Get review status/summary. |
| `GET` | `/api/v1/reviews/{reviewId}/findings` | Get findings. |
| `POST` | `/api/v1/reviews/{reviewId}/corrections` | Submit a correction. |
| `POST` | `/api/v1/reviews/{reviewId}/recheck` | Re-run required checks. |
| `POST` | `/api/v1/reviews/{reviewId}/decisions` | Record a reviewer decision. |
| `GET` | `/api/v1/reviews/{reviewId}/history` | Retrieve history. |
| `GET` | `/api/v1/approvals` | List pending approvals. |
| `POST` | `/api/v1/approvals/{approvalId}/decision` | Approve/reject/escalate. |
| `GET` | `/api/v1/learning-proposals` | List learning proposals. |
| `POST` | `/api/v1/learning-proposals/{proposalId}/decision` | Decide a proposal. |
| `GET` | `/api/v1/analytics/brand-drift` | Retrieve drift metrics. |
| `POST` | `/api/v1/policy-simulations` | Start a simulation. |
| `GET` | `/api/v1/policy-simulations/{simulationId}` | Retrieve simulation status/results. |

### API client requirements

- Centralise requests in a typed API client.
- Validate important untrusted responses with Zod or equivalent.
- Handle `401`, `403`, `404`, `409`, `413`, `422`, `429`, and `5xx` explicitly.
- Use cancellation/timeouts for requests that become irrelevant.
- Avoid blind retries for consequential mutations.
- Use idempotency keys or server-supported request IDs where duplicate submissions would be harmful.
- Invalidate cached data after successful mutations.
- Never log tokens or full confidential documents.
- Include request/correlation IDs in error reports if available.

### Long-running reviews

Use the approach supported by the backend:
1. Poll a status endpoint with a reasonable interval and backoff.
2. Use Server-Sent Events (SSE) for progress if supported.
3. Use WebSockets only when bidirectional real-time communication is required.

Always provide a stable fallback if live updates disconnect.

---

## 10. Illustrative TypeScript Models

Match these types to the backend schemas.

```ts
export type ReviewStatus =
  | "queued"
  | "processing"
  | "needs_review"
  | "approved"
  | "rejected"
  | "on_hold"
  | "failed";

export type FindingSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type ClaimAssessment =
  | "supported"
  | "contradicted"
  | "unverified"
  | "inconclusive";

export interface EvidenceReference {
  id: string;
  title: string;
  excerpt?: string;
  sourceType: string;
  approvalStatus: "approved" | "unapproved" | "unknown";
  validFrom?: string;
  validUntil?: string;
  href?: string;
}

export interface ReviewFinding {
  id: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: "open" | "accepted" | "dismissed" | "resolved";
  excerpt?: string;
  ruleId?: string;
  ruleVersion?: string;
  evidence: EvidenceReference[];
  assessment?: ClaimAssessment;
  uncertainty?: string;
  recommendedAction?: string;
  requiresHumanReview: boolean;
}

export interface ReviewSummary {
  id: string;
  title: string;
  brandId: string;
  contentVersion: number;
  policyVersion: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  findings: ReviewFinding[];
}
```

Handle all status values explicitly. A new or unknown backend status must not accidentally display as approved.

---

## 11. State Management

### Server state

Brands, reviews, rules, findings, approvals, and analytics:
- Use TanStack Query or an equivalent cache.
- Define consistent query keys.
- Invalidate or update caches after mutations.
- Show stale-data indicators when freshness matters.
- Avoid duplicate unsynchronised copies of the same entity.

### Local UI state

Selected finding, open drawer, selected tab, active filter:
- Use React state/context.
- Keep state near the component that owns it.
- Use URL query parameters for shareable filters and pagination when useful.

### Form state

- Use React Hook Form + Zod for complex forms.
- Provide inline, accessible errors.
- Preserve user input after failed requests.

### Review workflow state

- The backend is authoritative for review status and approval decisions.
- Do not treat an optimistic frontend update as final approval.
- Preserve unsaved edits and warn before navigating away from a dirty editor.

---

## 12. Security and Privacy

### Authentication and authorisation

- Use the selected authentication provider's supported integration.
- Do not store long-lived secrets in `localStorage`.
- Enforce organisation/resource permissions on the backend.
- Treat every browser-supplied identifier as untrusted.
- Do not rely on hidden buttons as an authorisation mechanism.

### Upload security

- Display supported types and size limits.
- Validate file extension, MIME type, and actual content on the server.
- Show upload progress and clear failure states.
- Do not render untrusted HTML as trusted markup.
- Do not automatically open unsafe uploaded files.
- Explain processing and retention where relevant.

### AI content safety

- Treat uploaded content and document instructions as untrusted data.
- Render content as text by default.
- Clearly distinguish generated suggestions from approved policy.
- Never allow a UI action to bypass backend approval or validation.

### Privacy-safe telemetry

- Do not send full content, private evidence, tokens, or sensitive source excerpts to analytics by default.
- Redact user data from error reports where possible.
- Follow the organisation's retention and consent requirements.

---

## 13. Accessibility and Responsive Design

Aim for WCAG 2.2 AA, subject to validation.

- Keyboard access for every interactive control.
- Visible focus indicators.
- Semantic headings and landmarks.
- Labels and validation messages associated with form fields.
- Accessible names for icon-only buttons.
- Status communicated with text as well as colour.
- Adequate text and control contrast.
- Appropriate live regions for async status changes.
- Dialogs manage focus and return it on close.
- Respect reduced-motion settings.
- Provide a table/list alternative to graph interaction.
- Make inline annotations understandable without colour alone.
- Test keyboard and screen-reader workflows.

### Responsive behaviour

**Desktop:** Sidebar and three-column review workspace where practical.

**Tablet:** Collapsible navigation and two-column review workspace; evidence may move to a drawer.

**Mobile:** One primary panel at a time; findings, content, and evidence in tabs or stacked sections; large, clearly labelled actions.

The review workspace is desktop-first, but core review and approval actions should remain usable on mobile.

---

## 14. Loading, Empty, Error, and Partial States

Every API-backed screen needs explicit states.

### Loading
- Layout-matched skeletons.
- Progress for uploads and long-running reviews.
- Avoid indefinite spinners without explanation.

### Empty
- No reviews: show how to start one.
- No approved rules: guide the user to create/import a brand profile.
- No learning proposals: explain that proposals require relevant feedback.
- No drift data: explain the history needed for meaningful trends.

### Error
- Plain-language message.
- Retry where appropriate.
- Preserve user-entered data.
- Show a safe correlation ID if available.
- Do not expose stack traces, tokens, or internal prompts.

### Partial data
If a non-critical panel fails, preserve other information and label the missing section. If a required check fails, do not display an overall clean pass.

---

## 15. Performance

- Use route-level code splitting and lazy-load heavy editors or graph libraries.
- Optimise uploaded image previews.
- Paginate large review and audit tables.
- Debounce search where appropriate.
- Cancel stale requests.
- Avoid rerendering the entire workspace on every keystroke.
- Virtualise only when list sizes justify the complexity.
- Cache only appropriate data and define invalidation rules.
- Measure Core Web Vitals and key workflow timings.

The frontend should not independently launch all AI agents. The backend orchestrator controls dependencies, concurrency, retries, and cost.

---

## 16. Testing Strategy

### Unit tests
- Status/severity mapping.
- Permission-based action visibility.
- Form validation.
- Diff formatting.
- Source metadata rendering.
- API error mapping.

### Component tests
- Finding card.
- Evidence panel.
- Correction editor.
- Approval dialog.
- Rule editor.
- Learning proposal card.
- Loading, empty, and error states.

### End-to-end journeys
1. Sign in and open dashboard.
2. Select a brand.
3. Submit content for review.
4. Observe review progress.
5. Open a finding and inspect evidence.
6. Apply a correction and recheck.
7. Submit a reviewer decision.
8. Confirm audit history.
9. Propose a policy improvement.
10. Confirm the proposal remains inactive until approved.
11. Confirm a user from another organisation cannot access the review.

### Quality gates
- TypeScript checks pass.
- Lint passes.
- Unit/component tests pass.
- Critical Playwright flows pass.
- No known high-severity accessibility regression.
- No secrets in the client bundle.
- Cross-organisation access tests pass.

---

## 17. Implementation Roadmap

### Phase 1 — Design foundation
- Define design tokens and reusable UI components.
- Build AppShell, navigation, buttons, forms, badges, dialogs, and empty/error states.
- Implement responsive layout and keyboard navigation.

**Deliverable:** Consistent visual system and working navigation.

### Phase 2 — Authentication and dashboard
- Connect authentication.
- Load current user/workspace.
- Add role-aware navigation.
- Connect dashboard to real endpoints.
- Implement loading/empty/error states.

**Deliverable:** Users see the correct workspace and real dashboard data.

### Phase 3 — Core review workflow
- Build review submission and supported uploads.
- Build review list and workspace.
- Display findings, policy links, evidence, and uncertainty.
- Handle long-running progress.

**Deliverable:** Users can submit content and inspect structured findings.

### Phase 4 — Corrections and approvals
- Build correction editor and diff.
- Implement recheck.
- Add approval queue and decisions.
- Preserve versions and audit history.

**Deliverable:** Users can correct, recheck, and make authorised decisions without overwriting originals.

### Phase 5 — Brand governance
- Build Brand DNA, rules, approved claims, assets, documents, and versions.
- Add Policy Conflict Center.

**Deliverable:** Approved brand knowledge is manageable and traceable.

### Phase 6 — Trust and improvement
- Add Trust Graph/relationship explorer.
- Add learning proposals and approval workflow.
- Add Brand Drift Radar.
- Add Simulator and Digital Twin screens when backend support exists.

**Deliverable:** Users can inspect dependencies and review candidate improvements.

### Phase 7 — Hardening
- Accessibility and responsive review.
- Security/authorisation tests.
- Error monitoring and performance tuning.
- End-to-end regression tests.
- Demo-data separation and documentation.

**Deliverable:** A demonstrable product that does not hide failures or misrepresent metrics.

---

## 18. Definition of Done

Every feature must have:
- A defined user goal.
- Loading, empty, success, error, and partial states where relevant.
- Permission-aware controls.
- Server-authoritative outcomes.
- Accessible labels and keyboard behaviour.
- Responsive layout.
- Typed API integration.
- Tests for the main journey.
- Privacy-safe logging.
- Clear user-facing explanations.
- No fabricated production data.
- Documented limitations.

---

## 19. MVP Priority Matrix

| Feature | Priority | Reason |
|---|---|---|
| Authentication and workspace | P0 | Secure multi-user foundation. |
| Brand selector and approved rules | P0 | Reviews need a policy context. |
| Content submission | P0 | Core input. |
| Review status and findings | P0 | Core value. |
| Evidence and policy details | P0 | Trust and explainability. |
| Correction and recheck | P0 | Makes findings actionable. |
| Human decisions and audit history | P0 | Accountability. |
| Brand DNA management | P1 | Maintains approved knowledge. |
| Policy Conflict Center | P1 | Governance differentiation. |
| Trust Graph | P1 | Signature traceability; start with a simple relationship explorer. |
| Learning proposals | P1 | Controlled improvement. |
| Brand Drift Radar | P2 | Needs reliable historical data. |
| Visual Integrity UI | P2 | Depends on supported image checks. |
| What-If Simulator | P2 | Needs versioned rules and evaluation data. |
| Governance Digital Twin | P2 | Needs content dependency tracking. |
| CMS publishing integrations | P3 | Adds integration and security complexity. |

---

## 20. Demo Strategy

Use a clearly labelled sample organisation and sample advertisement with known issues:
- Unsupported percentage claim.
- Outdated product name.
- Missing required disclaimer.
- Tone or terminology violation.

Demonstrate:
1. Upload the content and select the approved brand.
2. Show review progress.
3. Open each finding.
4. Inspect the exact policy and evidence.
5. Show uncertainty when evidence is missing.
6. Apply a targeted correction.
7. Recheck the revised content.
8. Route unresolved issues to a human.
9. Display the Trust Graph and audit history.
10. Show how reviewer feedback becomes a candidate learning proposal.
11. Run regression tests before a policy change is activated.
12. Display real evaluation results and known limitations.

Mark all fixture values as **Demo data**. Never invent accuracy, cost savings, or review-time improvements and present them as measured results.

---

## 21. Final Recommendation

Build the **review workspace first**. A complete, trustworthy review loop is more valuable than an elaborate dashboard with incomplete functionality.

The frontend should make these things visible:
- Evidence and policies.
- Version history.
- Uncertainty.
- Reviewable corrections.
- Human accountability.
- Controlled learning proposals.
- Audit trails.
- Honest metrics.
- Security and accessibility.

Once users can reliably submit content, inspect evidence, correct findings, recheck results, and approve them with an audit trail, add the advanced governance experiences around that proven workflow.
