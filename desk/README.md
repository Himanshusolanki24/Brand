# BrandProof — frontend (Round 2 build)

**Proof your brand before the world does.** Frontend demo for the Inkloom AI hackathon:
a brand-governance workspace where trained-model-adjacent flags always cite the exact
guideline clause, suggested fixes keep the writer's intent, and nothing ever ships
without a named human signature.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Open **http://localhost:3000** → "Open the demo workspace" (or sign in with any
email — the demo code is `0007`). The workspace ships pre-loaded with a fictional
brand, **Meridian Coffee**, and an end-to-end flow:

1. **Reviews** — open *April email — cold brew launch*: flagged sentences are marked
   in place; the proofing tray on the right holds citation-anchored issue cards.
   Accept, Edit (your own words), or Dismiss — dismissal requires a written reason.
2. **Send for approval** once every flag is decided → the piece lands on the
   **Approval manifest** → sign it (type the approver's name) or return it with a note.
3. **Intake** — paste any draft and run the demo analyzer (rules check superlatives,
   unanchored numbers, physiology claims, competitor names, absolutes, eco terms).
4. **Knowledge base** — guidelines, fact sheet, terminology, assets, plus the
   **Guideline Clarity Radar** and its draft amendments (ratify one and the
   rulebook version bumps).
5. **How this review works** — the AI-disclosure page: what's automated, what's
   simulated, and the four things the AI is never allowed to do.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
lucide-react icons · no UI kit beyond a small native-HTML set (`<dialog>`, semantic
buttons). State is a typed reducer in `src/lib/store.tsx` over seed data in
`src/lib/seed.ts` — **that contract now has a real backend**: the governance
engine in `../engine` (FastAPI, port 8900). Demo mode runs offline exactly as
before; sign in with a seeded engine email and the desk hydrates from
`GET /api/workspace` and speaks to the engine instead (see the monorepo
`../README.md`).

Demo seeds reset on reload; nothing is sent anywhere unless the engine is
running and you signed in with a seeded email.
