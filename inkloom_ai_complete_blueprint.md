# Inkloom AI --- Complete Product & Technical Blueprint

## 1. Product Vision

**Inkloom AI** is a multi-agent brand-governance platform for reviewing
human-written and AI-generated content before publication. It checks
content against an organisation's approved brand identity, claims,
terminology, policies, visual assets, and evidence.

The goal is not merely to flag mistakes. Inkloom AI should explain why
an issue was detected, connect the finding to the exact policy or
evidence that supports it, suggest a targeted correction, route
uncertain or high-risk cases to an authorised human, and learn from
approved feedback without silently changing official rules.

### Product positioning

> Inkloom AI is a trust and governance layer for AI-generated and
> human-written content. It connects important decisions to approved
> evidence, validates compliance against versioned policies, identifies
> content affected by changing information, and keeps humans in control
> of consequential decisions.

### Product principles

1.  **Evidence before assertion:** Important findings should cite
    relevant approved sources or policies.
2.  **Explicit uncertainty:** Missing evidence is not proof that a claim
    is false.
3.  **Human accountability:** High-risk or ambiguous decisions require
    authorised review.
4.  **Versioned governance:** Every review should identify the content
    and policy versions it evaluated.
5.  **Controlled learning:** Feedback can propose improvements, but
    official policy changes require approval.
6.  **Measurable quality:** Claims about accuracy and trust must be
    backed by evaluation.
7.  **Privacy by design:** Each organisation's documents, reviews, and
    memory must remain isolated.

------------------------------------------------------------------------

## 2. The Problem

Organisations publish content through employees, agencies, and AI tools.
Brand information is spread across brand guides, approved claims,
terminology files, product documents, legal approvals, and reviewer
knowledge.

This creates several risks:

-   Unsupported or outdated product claims.
-   Inconsistent brand voice and terminology.
-   Missing disclaimers or required wording.
-   Incorrect use of logos, colours, and approved assets.
-   Contradictory or ambiguous guidelines.
-   Repeated mistakes that reviewers must correct manually.
-   Existing published content becoming outdated after product or policy
    changes.
-   Decisions that are difficult to explain or reconstruct later.

Inkloom AI centralises the applicable knowledge and provides a traceable
review workflow before content is published.

------------------------------------------------------------------------

## 3. Product Layers

### Layer 1 --- Prevent

-   Brand DNA Engine.
-   Evidence-Backed Claim Verification.
-   Policy Conflict Detector.
-   Text, terminology, tone, and visual checks.

### Layer 2 --- Resolve

-   Explainable findings.
-   Evidence and policy references.
-   Minimal corrections.
-   Automatic rechecks.
-   Risk-based human approval.
-   Versioned decision and audit history.

### Layer 3 --- Improve

-   Brand Memory with Controlled Learning.
-   Brand Drift Radar.
-   What-If Brand Simulator.
-   Governance Digital Twin.
-   Inkloom Trust Graph.
-   Benchmarking and regression testing.

------------------------------------------------------------------------

## 4. Core Features

### 4.1 Brand DNA Engine

**Purpose:** Convert an organisation's documents and decisions into a
structured, versioned representation of its brand identity.

It may capture:

-   Preferred and prohibited terminology.
-   Tone, voice, and writing style.
-   Approved product descriptions.
-   Approved claims and their permitted context.
-   Required disclaimers.
-   Market, language, product, and channel restrictions.
-   Approved logos, colours, imagery, and assets.
-   Links to relevant source documents.
-   Rule owners, effective dates, and expiry dates.

**Workflow:**

1.  An authorised user uploads brand guides, product documents, approved
    claims, and terminology files.
2.  The system extracts relevant text and metadata.
3.  An AI-assisted extraction step proposes structured rules.
4.  Validation checks required fields, duplicates, and contradictions.
5.  A brand administrator reviews and approves the proposed rules.
6.  The approved brand profile receives a version number.
7.  Reviews use the applicable approved version.

**Important safeguard:** Do not treat AI-extracted rules as official
until an authorised person approves them.

### 4.2 Evidence-Backed Claim Verification

**Purpose:** Check important statements against approved, relevant, and
current evidence.

For each claim, the system should:

1.  Extract the claim from the content.
2.  Identify its product, market, audience, and context when possible.
3.  Retrieve relevant approved sources.
4.  Check source status, dates, scope, and applicability.
5.  Assess whether the evidence supports, contradicts, or fails to
    establish the claim.
6.  Store the source passages used.
7.  Explain the result and recommend a next action.

**Recommended result categories:**

-   **Supported:** Applicable evidence supports the claim.
-   **Contradicted:** Applicable evidence conflicts with the claim.
-   **Unverified:** No sufficient approved evidence was found.
-   **Inconclusive:** Evidence is incomplete, ambiguous, or not
    applicable.

Do not label a claim false simply because retrieval did not find
evidence. Do not allow the model to invent citations or treat an
unrelated source as support.

### 4.3 Policy Conflict Detector

**Purpose:** Identify contradictory, ambiguous, outdated, or overlapping
rules.

Examples:

-   A general tone guideline conflicts with a stricter rule for
    financial advertising.
-   A product claim is approved for one market but used in another.
-   A policy has expired but is still being retrieved.
-   Two rules require incompatible wording.
-   A rule lacks a clear owner, scope, or effective date.

The system should explain the potential conflict, identify the relevant
rules, and route unresolved cases to an authorised policy owner. It
should not silently decide which policy wins based only on an LLM's
preference.

### 4.4 Brand Memory with Controlled Learning

**Purpose:** Reuse approved decisions and identify recurring corrections
without allowing uncontrolled self-modification.

The system can remember:

-   Approved terminology decisions.
-   Accepted and rejected corrections.
-   Human overrides and reasons.
-   Known exceptions and their scope.
-   Repeated patterns in reviewer feedback.
-   Previously approved rules and policy versions.

**Learning lifecycle:**

1.  An agent produces a finding or correction.
2.  A human reviewer accepts, rejects, or modifies it.
3.  The system records the decision and relevant context.
4.  Repeated patterns are analysed.
5.  The system proposes a reusable rule or workflow improvement.
6.  An authorised administrator approves or rejects the proposal.
7.  An approved change receives a new version.
8.  Regression tests run before the change is deployed.
9.  Future reviews use the new version where applicable.

**Safe automatic actions:**

-   Retrieve already approved corrections.
-   Identify recurring mistakes.
-   Recommend candidate rules.
-   Test candidate rules on historical examples.
-   Report expected false positives and missed violations.

**Actions that should not happen automatically:**

-   Rewriting official legal or regulatory interpretations.
-   Promoting unverified claims to approved status.
-   Changing official policy from a single correction.
-   Treating an agent's own answer as ground truth.
-   Deploying policy changes merely because several agents agree.

Start with feedback-driven retrieval and approval-gated rule changes.
Consider model fine-tuning only after collecting enough high-quality
reviewed examples and demonstrating that retrieval and workflow
improvements are insufficient.

### 4.5 Visual Brand Integrity Scanner

**Purpose:** Check images and other visual assets against measurable
brand requirements.

Possible checks:

-   Logo presence and approved variants.
-   Approximate or exact brand colour checks where technically
    appropriate.
-   Use of outdated assets.
-   Text extracted from images using OCR.
-   Required disclaimers embedded in creative assets.
-   Image dimensions and layout constraints.
-   Contrast and accessibility checks.
-   Semantic image issues that require vision-model interpretation.

Use deterministic image processing for measurable properties, such as
pixel colours or contrast, and a vision model for semantic
interpretation. Do not rely on a vision model alone for exact colour or
pixel-level checks.

### 4.6 Risk-Based Approval Routing

**Purpose:** Route content based on the organisation's configured policy
and the seriousness of potential issues.

A possible workflow:

-   **Pass:** No blocking issues were found by the required checks.
-   **Review:** Ambiguous, incomplete, or moderate-risk findings need
    review.
-   **Escalate / Hold:** High-risk or unresolved issues require an
    authorised decision before publication.

The precise thresholds and consequences must be configurable by the
organisation. A model confidence score alone should not determine
whether content is safe to publish.

If a required checking service fails, the system should not silently
treat the content as passed.

### 4.7 Governance Digital Twin

**Purpose:** Simulate the impact of proposed policy or
product-information changes before adopting them.

Example:

1.  An organisation updates a product's approved claim.
2.  Inkloom identifies content and assets linked to the old claim.
3.  The system evaluates affected content against the proposed new
    policy.
4.  It produces a list of items that may need review.
5.  Reviewers resolve the affected items.
6.  The organisation records the policy change and its impact.

A digital twin should identify potential impact, not automatically
declare all dependent content noncompliant. The relationship and
applicability of each change must be checked.

### 4.8 Inkloom Trust Graph

**Purpose:** Provide a traceable relationship between content, claims,
evidence, rules, corrections, and decisions.

The graph should connect:

-   Content item and exact version.
-   Extracted claims.
-   Supporting or contradicting evidence.
-   Applicable policy and policy version.
-   Agent findings.
-   Suggested corrections.
-   Human decisions and approvals.
-   Source validity dates and scope.

For example, when a product specification changes, Inkloom should be
able to identify claims and content that depended on the old
specification.

Start with relational links in PostgreSQL. A dedicated graph database is
optional and should be added only if real query requirements justify it.

### 4.9 Brand Drift Radar

**Purpose:** Detect recurring brand-compliance issues and changes over
time.

Possible insights:

-   Most frequently violated rules.
-   Content formats requiring the most corrections.
-   Guidelines that are repeatedly misunderstood.
-   Trends in false positives and missed violations.
-   Whether repeated issues decrease after an approved guideline or
    training change.
-   Content that may be affected by changes to claims, assets, or
    policies.

Use measured data and clearly label illustrative dashboard values.
Correlation does not automatically prove that a particular intervention
caused improvement.

### 4.10 What-If Brand Simulator

**Purpose:** Test proposed brand-rule changes against historical content
before applying them.

The simulator can show:

-   Which examples would pass or fail under the proposed rule.
-   Which content may newly require review.
-   Potential false-positive cases.
-   Differences between the current and candidate policy.
-   Evaluation results before a rule is approved.

A simulation is an estimate based on the available test set, not a
guarantee of future behaviour.

### 4.11 Minimal Correction and Recheck

**Purpose:** Suggest the smallest useful edit that addresses a finding.

The system should:

1.  Show the original text and exact issue.
2.  Cite the applicable rule and evidence.
3.  Propose a targeted edit.
4.  Explain how the edit addresses the finding.
5.  Re-run the relevant checks on the revised content.
6.  Show remaining issues and differences.
7.  Require human approval where policy requires it.

Do not silently rewrite large portions of content when a small
correction is sufficient.

------------------------------------------------------------------------

## 5. Multi-Agent Architecture

Use a central orchestrator with specialised agents and deterministic
services. Avoid building many independent autonomous agents that repeat
the same work.

### 5.1 Agents and responsibilities

  -----------------------------------------------------------------------
  Agent / component       Responsibility          LLM usage
  ----------------------- ----------------------- -----------------------
  Orchestrator            Coordinates workflow,   Optional; deterministic
                          state, dependencies,    routing is preferred
                          and retries.            where possible.

  Brand DNA Agent         Extracts candidate      Yes, followed by
                          brand rules and         validation and
                          terminology from        approval.
                          documents.              

  Evidence Verification   Extracts claims and     Yes, with retrieval and
  Agent                   retrieves relevant      source validation.
                          approved evidence.      

  Policy Conflict Agent   Identifies potentially  Yes, supplemented by
                          conflicting or          deterministic checks.
                          ambiguous rules.        

  Tone & Style Agent      Reviews voice,          Yes.
                          terminology, and        
                          messaging.              

  Visual Integrity Agent  Reviews images and      Vision model plus
                          visual brand            image-processing tools.
                          requirements.           

  Critic / Validation     Challenges findings and Yes, supplemented by
  Agent                   checks whether evidence rule-based checks.
                          supports conclusions.   

  Correction Agent        Suggests minimal edits  Yes, followed by a
                          and explanations.       recheck.

  Risk & Approval Router  Applies configured      Primarily
                          review and escalation   deterministic; AI may
                          policies.               extract context.

  Brand Learning Agent    Analyses approved       Yes, with human
                          feedback and proposes   approval for changes.
                          improvements.           

  Brand Drift Agent       Summarises recurring    Analytics first; AI may
                          violations and trends.  summarise results.

  Governance Digital Twin Simulates policy        Rules, dependency
  Service                 changes and identifies  analysis, and optional
                          dependent content.      AI explanations.
  -----------------------------------------------------------------------

### 5.2 Proposed review workflow

``` text
                    CONTENT INPUT
                         |
                         v
               ORCHESTRATOR / WORKFLOW
                         |
                         v
                CONTENT UNDERSTANDING
          Extract text, claims, images and context
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
        BRAND RULES   CLAIM &      TONE &
          AGENT       EVIDENCE      STYLE
                         AGENT       AGENT
             |           |           |
             +-----------+-----------+
                         |
                         v
                VISUAL REVIEW MODULE
                         |
                         v
                CRITIC / VALIDATION
          Challenges findings and evidence
                         |
                         v
                 DECISION ENGINE
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
           PASS        REVIEW       HOLD /
                                  ESCALATE
             |           |           |
             |           v           v
             |       HUMAN REVIEW   AUTHORISED
             |           |          RESOLUTION
             +-----------+-----------+
                         |
                         v
                CORRECTION + RECHECK
                         |
                         v
                 FINAL REVIEW REPORT
                         |
                         v
                 TRUST GRAPH + AUDIT
                         |
                         v
                CONTROLLED LEARNING
```

### 5.3 Agent output contract

Each agent should return structured data rather than unstructured prose
wherever practical.

Example:

``` json
{
  "agent": "evidence_verification",
  "finding_type": "claim_verification",
  "claim_text": "Reduces operational costs by 40%",
  "status": "unverified",
  "rule_ids": ["rule_014"],
  "evidence_ids": [],
  "reason": "No applicable approved source was found.",
  "uncertainty": "The claim may be supportable, but the available evidence is insufficient.",
  "recommended_action": "Provide approved supporting evidence or remove the percentage.",
  "requires_human_review": true
}
```

This is an illustrative schema. Validate all agent outputs with Pydantic
or equivalent schemas, and verify that referenced rules and evidence
actually exist and are accessible to the current organisation.

------------------------------------------------------------------------

## 6. Recommended Technology Stack

  --------------------------------------------------------------------------
  Layer                   Recommended technology     Purpose
  ----------------------- -------------------------- -----------------------
  Frontend                Next.js + TypeScript       Application and
                                                     dashboard.

  UI                      Tailwind CSS + shadcn/ui   Consistent interface
                                                     components.

  Backend API             FastAPI + Python           AI, policy, and
                                                     governance APIs.

  Agent orchestration     LangGraph or a controlled  Multi-step stateful
                          Python workflow            execution and approval
                                                     checkpoints.

  AI models               LLM API with structured    Extraction,
                          outputs                    interpretation,
                                                     explanation, and
                                                     correction.

  Output validation       Pydantic + deterministic   Validate agent results
                          Python rules               and enforce exact
                                                     checks.

  Database                PostgreSQL                 Organisations,
                                                     policies, content,
                                                     reviews, approvals, and
                                                     audit records.

  Vector retrieval        pgvector                   Semantic retrieval of
                                                     relevant approved
                                                     knowledge.

  Authentication          Supabase Auth              Authentication and
                                                     membership.

  File storage            Supabase Storage or        Brand documents and
                          equivalent private object  assets.
                          storage                    

  Document parsing        Python                     Extract content and
                          PDF/DOCX/text-processing   metadata.
                          libraries                  

  Visual checks           Pillow/OpenCV + vision     Measurable image checks
                          model                      and semantic review.

  Background jobs         Redis + Celery, if needed  Asynchronous processing
                                                     and monitoring.

  Deployment              Vercel + Python-compatible Deploy frontend, API,
                          backend hosting            and workers.

  Testing                 Pytest + labelled          Test quality and
                          evaluation dataset         regressions.

  Observability           OpenTelemetry + error      Latency, failures, and
                          monitoring                 operational health.
  --------------------------------------------------------------------------

### Why this stack?

-   It avoids training a custom model before the product has enough
    reviewed data.
-   It supports structured, testable workflows.
-   PostgreSQL and pgvector reduce early infrastructure complexity.
-   It supports human approval and versioned governance.
-   It allows expensive components to be added only when the MVP needs
    them.

------------------------------------------------------------------------

## 7. Database Design

Recommended tables:

  -----------------------------------------------------------------------
  Table                               Purpose
  ----------------------------------- -----------------------------------
  `organizations`                     Companies using the platform.

  `organization_members`              Users, roles, and membership.

  `brands`                            Brand profiles.

  `brand_dna_versions`                Versioned brand identity and style
                                      configuration.

  `brand_rules`                       Individual rules and scope.

  `brand_rule_versions`               Rule history and effective
                                      versions.

  `brand_assets`                      Approved logos, images, colours,
                                      and assets.

  `knowledge_documents`               Uploaded guidelines and product
                                      documents.

  `evidence_sources`                  Source metadata, passages,
                                      validity, and approval status.

  `claims`                            Claims extracted from content.

  `claim_evidence`                    Claim-to-evidence relationships.

  `content_items`                     Submitted content.

  `content_versions`                  Original and revised versions.

  `reviews`                           Review status, versions, and
                                      overall results.

  `agent_runs`                        Agent execution status and
                                      configuration references.

  `violations`                        Findings linked to content and
                                      rules.

  `corrections`                       Proposed and accepted edits.

  `reviewer_feedback`                 Human decisions, overrides, and
                                      feedback.

  `learning_proposals`                Candidate rules and workflow
                                      improvements.

  `approvals`                         Human approval records.

  `policy_conflicts`                  Potentially conflicting or
                                      ambiguous rules.

  `content_dependencies`              Links content to claims, policies,
                                      and sources.

  `audit_logs`                        Important changes and decisions.

  `review_metrics`                    Aggregated quality and operational
                                      metrics.
  -----------------------------------------------------------------------

### Data and security requirements

-   Enforce organisation-level access control and row-level security
    where appropriate.
-   Validate authorisation on the server; do not rely only on frontend
    controls.
-   Store private files in protected storage.
-   Keep policy, content, and evidence versions.
-   Avoid storing secrets or unnecessary sensitive content in logs.
-   Define retention and deletion policies.
-   Treat uploaded documents as untrusted input; do not let document
    instructions override system policies.
-   Ensure retrieval is scoped to the current organisation and permitted
    users.

------------------------------------------------------------------------

## 8. Controlled Learning and Memory Design

### 8.1 Three types of memory

**Workflow memory** - State for the current review. - Extracted claims,
retrieved evidence, findings, and approval status. - Managed by the
orchestrator.

**Approved organisational memory** - Approved rules, terminology,
claims, exceptions, and reviewer decisions. - Stored in PostgreSQL and
retrieved with pgvector where appropriate. - Versioned and
permission-controlled.

**Learning proposal memory** - Candidate improvements inferred from
reviewer feedback. - Kept separate from approved rules until accepted. -
Tested against historical examples before deployment.

### 8.2 Learning lifecycle

``` text
Finding
  -> Human decision
  -> Feedback record
  -> Pattern analysis
  -> Candidate improvement
  -> Historical regression test
  -> Authorised approval
  -> New version
  -> Deployment
  -> Ongoing monitoring
```

### 8.3 Evaluation before deployment

For each candidate rule or workflow change, measure:

-   New violations detected.
-   Previously correct content newly flagged.
-   Violations that would be missed.
-   Evidence quality.
-   Changes in review latency.
-   Changes in human correction acceptance.

Keep a record of the evaluation dataset and the version tested. Do not
claim a change improves accuracy unless the results support that
conclusion.

------------------------------------------------------------------------

## 9. Trust, Safety, and Failure Handling

### 9.1 Evidence quality

-   Save the source passage used for each finding.
-   Preserve source metadata and versions.
-   Check applicability to the product, market, date, and context.
-   Distinguish unsupported from contradicted claims.
-   Do not fabricate citations.
-   Require review when evidence is ambiguous or unavailable for
    high-risk claims.

### 9.2 Agent failures

-   Validate structured outputs.
-   Use bounded retries.
-   Record failed stages.
-   Apply timeouts and cost limits.
-   Do not silently mark content as passed if a required check fails.
-   Route unresolved cases to a human.

### 9.3 Prompt injection

Uploaded documents, webpages, and content may contain malicious
instructions. Treat them as data, not as trusted system instructions.
Keep tool permissions narrow, restrict outbound access, and validate
every proposed action.

### 9.4 Privacy

-   Enforce tenant isolation.
-   Use private storage and least-privilege access.
-   Protect secrets and API keys.
-   Define data retention and deletion policies.
-   Review model-provider data handling and contractual requirements
    before using confidential customer content.
-   Avoid exposing full source documents when a limited evidence passage
    is sufficient.

### 9.5 Learning risks

-   A human correction may be context-specific.
-   Reviewer feedback can be inconsistent.
-   A proposed rule can cause new false positives.
-   A model can repeatedly reinforce its own mistakes.

Therefore, retain the original decision, feedback provenance, policy
version, and approval record. Require regression tests for changes that
affect future reviews.

------------------------------------------------------------------------

## 10. Evaluation Framework

Build a labelled dataset containing:

-   Correct and approved claims.
-   Unsupported claims.
-   Contradicted claims.
-   Outdated product information.
-   Terminology violations.
-   Tone violations.
-   Missing disclaimers.
-   Conflicting policies.
-   Valid content that should not be flagged.
-   Visual assets that do and do not meet defined requirements.

### Recommended metrics

  -----------------------------------------------------------------------
  Metric                              What it measures
  ----------------------------------- -----------------------------------
  Precision                           Proportion of reported violations
                                      that are valid.

  Recall                              Proportion of real violations
                                      detected.

  False-positive rate                 How often compliant content is
                                      incorrectly flagged.

  Evidence relevance                  Whether retrieved evidence is
                                      applicable to the claim.

  Citation correctness                Whether cited passages support the
                                      stated finding.

  Correction acceptance rate          How often reviewers accept proposed
                                      corrections.

  Escalation quality                  Whether uncertain or high-risk
                                      cases are routed appropriately.

  Review latency                      Time required to complete a review.

  Cost per review                     Model and infrastructure cost for a
                                      review.

  Regression rate                     Whether changes cause previously
                                      passing cases to fail or previously
                                      detected issues to be missed.
  -----------------------------------------------------------------------

Use the same test set when comparing versions of your system. If you
later compare with competitors, ensure the tasks, inputs, and scoring
process are comparable.

------------------------------------------------------------------------

## 11. Six-Week Implementation Roadmap

### Week 1 --- Foundation

-   Authentication and organisation boundaries.
-   Brand profile and guideline upload.
-   Rule extraction and human approval.
-   Versioned policies.

**Deliverable:** An organisation can create a brand profile with
approved rules.

### Week 2 --- Core review

-   Text ingestion.
-   Terminology and policy checks.
-   Structured findings.
-   Review dashboard.

**Deliverable:** Inkloom identifies basic violations and explains the
relevant rule.

### Week 3 --- Evidence verification

-   Claim extraction.
-   Approved-source retrieval.
-   Evidence-linked findings.
-   Unsupported versus contradicted status.

**Deliverable:** Important claims can be traced to relevant evidence or
clearly marked as unverified.

### Week 4 --- Critic and correction workflow

-   Critic/validation stage.
-   Minimal corrections.
-   Rechecks.
-   Human approval and audit history.

**Deliverable:** A user can inspect, correct, recheck, and approve a
content item.

### Week 5 --- Signature governance features

-   Inkloom Trust Graph.
-   Policy Conflict Detector.
-   Reviewer feedback records.
-   Controlled learning proposals.

**Deliverable:** Findings link to policies, evidence, and decisions,
while candidate improvements remain approval-gated.

### Week 6 --- Evaluation and demonstration

-   Labelled evaluation dataset.
-   Regression tests.
-   Metrics dashboard.
-   Failure and latency monitoring.
-   End-to-end demonstration.

**Deliverable:** A working prototype with measured results and
documented limitations.

After the six-week prototype, prioritise Brand Drift Radar, visual
review, the What-If Simulator, and the Governance Digital Twin according
to user feedback and demonstrated need.

This roadmap is a planning estimate, not a guarantee; actual delivery
depends on team size, experience, and scope.

------------------------------------------------------------------------

## 12. Suggested Project Structure

``` text
inkloom-ai/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   ├── brands/
│   │   │   ├── brand-dna/
│   │   │   ├── review/
│   │   │   ├── trust-graph/
│   │   │   ├── approvals/
│   │   │   ├── brand-drift/
│   │   │   ├── policy-simulator/
│   │   │   └── settings/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── orchestrator/
│   │   │   ├── workflow.py
│   │   │   ├── state.py
│   │   │   └── routing.py
│   │   ├── agents/
│   │   │   ├── brand_dna.py
│   │   │   ├── evidence.py
│   │   │   ├── policy_conflict.py
│   │   │   ├── tone_style.py
│   │   │   ├── visual_integrity.py
│   │   │   ├── critic.py
│   │   │   ├── correction.py
│   │   │   ├── learning.py
│   │   │   └── drift.py
│   │   ├── services/
│   │   │   ├── document_parser.py
│   │   │   ├── retrieval.py
│   │   │   ├── rules_engine.py
│   │   │   ├── risk_router.py
│   │   │   ├── trust_graph.py
│   │   │   ├── learning_engine.py
│   │   │   └── digital_twin.py
│   │   ├── database/
│   │   ├── schemas/
│   │   └── tests/
│   └── pyproject.toml
├── evaluation/
│   ├── datasets/
│   ├── test_cases/
│   ├── benchmarks/
│   └── reports/
├── database/
│   ├── migrations/
│   └── seed/
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── agent-workflows.md
│   └── evaluation.md
├── .env.example
├── docker-compose.yml
└── README.md
```

This is the intended target structure. Create directories and modules as
the corresponding phase begins rather than scaffolding everything at
once.

------------------------------------------------------------------------

## 13. Example End-to-End Review

Suppose a product page contains the claim:

> Our platform reduces operational costs by 40%.

A review could proceed as follows:

1.  The orchestrator identifies the content type and applicable brand.
2.  The Brand DNA and policy services retrieve relevant approved rules.
3.  The evidence agent extracts the claim and searches approved product
    documents.
4.  The system finds no applicable source supporting the exact
    percentage.
5.  The critic checks whether the retrieved sources actually support the
    claim.
6.  The decision engine marks the claim as unverified rather than false.
7.  The correction agent suggests removing the percentage or supplying
    approved evidence.
8.  The system rechecks the revised content.
9.  An authorised reviewer makes the final decision where required.
10. Inkloom records the content version, policy version, evidence
    searched, findings, correction, and human decision.
11. Approved feedback may later inform a learning proposal.
12. The Trust Graph preserves the links between the claim, evidence,
    policy, and decision.

This is an illustrative workflow. Actual outputs depend on the supplied
content, available evidence, policies, and evaluation results.

------------------------------------------------------------------------

## 14. Judge Demonstration Plan

Use a prepared advertisement containing four known issues:

1.  An unsupported performance claim.
2.  An outdated product name.
3.  A missing mandatory disclaimer.
4.  A tone or terminology violation.

Demonstrate the following:

1.  Upload the advertisement and load the approved brand profile.
2.  Show the agents or workflow stages running.
3.  Display each finding with the exact rule and evidence.
4.  Show how the critic validates or challenges a finding.
5.  Apply a targeted correction.
6.  Recheck the revised content.
7.  Route uncertain findings to a human.
8.  Display the Trust Graph and approval history.
9.  Show how reviewer feedback becomes a candidate learning proposal.
10. Run a regression test before approving a policy change.
11. Display real benchmark results and known limitations.

Avoid invented accuracy percentages or illustrative metrics presented as
real performance.

------------------------------------------------------------------------

## 15. Key Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Hallucinated findings or evidence   Evidence references, structured
                                      outputs, critic validation, and
                                      labelled tests.

  False positives                     Measure precision, support reviewer
                                      overrides, and improve rules using
                                      approved feedback.

  Missed violations                   Measure recall and test a range of
                                      realistic violation examples.

  Outdated evidence                   Track validity dates, source
                                      versions, and content dependencies.

  Contradictory rules                 Version policies and route
                                      unresolved conflicts to owners.

  Excessive model costs               Use deterministic checks first,
                                      retrieve selectively, and route
                                      only difficult cases to larger
                                      models.

  High latency                        Use bounded parallelism and
                                      background jobs where appropriate.

  Uncontrolled learning               Keep proposals separate from
                                      approved policies and require
                                      regression tests.

  Cross-organisation data leaks       Enforce tenant isolation,
                                      permissions, and retrieval
                                      filtering.

  Prompt injection                    Treat uploaded material as
                                      untrusted data and restrict tool
                                      permissions.

  Overly broad scope                  Build the core review workflow
                                      before advanced monitoring and
                                      simulation.

  Unsupported claims of superiority   Compare measured performance on
                                      comparable tasks before making
                                      superiority claims.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 16. Final Product Strategy

### The core promise

Inkloom AI should answer:

-   What is wrong with this content?
-   Which rule applies?
-   What evidence supports the finding?
-   What remains uncertain?
-   How can it be corrected?
-   Who must approve the result?
-   What changes if a claim or policy is updated?
-   How can the organisation prevent the same mistake in the future?

### Recommended initial priorities

1.  Brand DNA Engine.
2.  Evidence-Backed Claim Verification.
3.  Deterministic policy checks and Policy Conflict Detector.
4.  Critic and Correction Workflow.
5.  Human approval and audit history.
6.  Inkloom Trust Graph.
7.  Controlled learning with regression tests.

Then add Brand Drift Radar, Visual Brand Integrity Scanner, What-If
Brand Simulator, and Governance Digital Twin.

### Final recommendation

Build a trustworthy core before adding more agents. The agents are the
execution mechanism; the real product value is traceable evidence,
versioned governance, reliable corrections, accountable decisions, and
measurable improvement.

Inkloom AI should not claim to be more accurate than Arbitr or Adobe
until it has evidence. Instead, make its trust mechanisms visible and
testable so that users and evaluators can verify how it works.
