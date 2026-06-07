# Vena CX AI Cadence Board

Role-specific prototype for the **Vena Solutions Customer Experience AI Architect** application.

Live website: [https://vena-olive.vercel.app](https://vena-olive.vercel.app)  
GitHub repository: [https://github.com/shrishmanglik/vena](https://github.com/shrishmanglik/vena)

## Overview

This prototype demonstrates a governed operating cadence for AI work across a Customer Experience organization. It is designed as an interview walkthrough artifact: concise enough to explain in 20 minutes, but concrete enough to show how AI ideas become owned, scored, reviewed, released, and measured workflows.

The board models the path from **intake -> prioritization -> build/QA -> release -> adoption -> impact review** for post-sales workflows across:

- Professional Services
- Customer Adoption
- Managed Services
- Customer Enablement

## Why This Fits The Role

Vena's Customer Experience AI Architect role calls for someone who can translate CX pain points into governed AI tools, prioritize the backlog, build production-grade workflows, coordinate with IT/Security/Product, and drive adoption.

This prototype shows that operating model in miniature:

- AI opportunities are scored by business value, feasibility, risk, urgency, strategic fit, and data sensitivity.
- Each workflow has source maps, owner assignments, human approval points, QA checks, release notes, and adoption guidance.
- Sensitive actions are explicitly non-autonomous: the system can draft, route, or prepare work, but a human owner approves write/send actions.
- Measurable impact is visible through hours saved, time-to-value movement, adoption readiness, and data quality lift.

## Demo Walkthrough

Start with the live site: [https://vena-olive.vercel.app](https://vena-olive.vercel.app)

1. Review the portfolio summary at the top of the page.
2. Add a new workflow through the intake form.
3. Use the board filters to inspect work by stage or risk tier.
4. Open a workflow card and review the detail panel.
5. Copy the executive handoff brief.
6. Walk through the readiness gates, source map, tool/API plan, QA checklist, release notes, adoption playbook, impact model, and audit log.

## Core Features

- Deterministic opportunity scoring
- Risk tiering with data-sensitivity penalty
- Governance readiness scoring
- Approval readiness, QA readiness, and source readiness
- Next-gate recommendations
- Copyable executive handoff brief
- RAG / knowledge-source map
- Tool and API action plan
- Human approval points
- QA and evaluation checklist
- Release and handoff notes
- Adoption playbook
- Impact dashboard
- Audit log

## Governance Posture

This is intentionally deterministic-first.

- No AI API calls are made at runtime.
- No external messages are sent.
- No customer data is stored.
- No autonomous write/send action is performed.
- No generated image assets are used.
- All sample data is fictional and role-specific.

The prototype is a working demo of the operating cadence, not a claim of production deployment inside Vena.

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- Vercel

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run test
npm run typecheck
npm run build
```

Current verification coverage includes deterministic scoring and governance-readiness tests.

## Deployment

Production is deployed on Vercel:

[https://vena-olive.vercel.app](https://vena-olive.vercel.app)

Typical deployment command:

```bash
npx vercel deploy --prod --yes --archive=tgz
```

## Update Protocol

Every meaningful update to this prototype should also update GitHub.

Required steps:

1. Update source and documentation together when behavior or positioning changes.
2. Run `npm run test`, `npm run typecheck`, and `npm run build`.
3. Confirm no private application documents are staged.
4. Commit with a conventional message.
5. Push to `main` on [shrishmanglik/vena](https://github.com/shrishmanglik/vena).
6. Redeploy to Vercel when the website behavior or UI changes.
7. Smoke-test [https://vena-olive.vercel.app](https://vena-olive.vercel.app) after deployment.

Private application files such as resumes, cover letters, job-description analysis, and PDFs should remain local-only unless explicitly approved for publication.
