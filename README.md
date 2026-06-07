# Vena CX AI Operating Cadence Board

Role-specific prototype for the **Vena Solutions Customer Experience AI Architect** application.

Live website: [https://vena-olive.vercel.app](https://vena-olive.vercel.app)  
GitHub repository: [https://github.com/shrishmanglik/vena](https://github.com/shrishmanglik/vena)

## Executive Summary

This is a working prototype of a governed CX AI operating system for Vena. It turns post-sales AI ideas into a portfolio that can be owned, scored, built, reviewed, released, and measured across Professional Services, Customer Adoption, Managed Services, and Customer Enablement.

The goal is not to simulate an AI chatbot. The goal is to show the judgment a Customer Experience AI Architect needs at Vena: choose the right workflows, ground them in trusted business sources, keep Microsoft-native work habits intact, enforce human approval gates, and prove pilot value with evidence.

## Vena-Specific Thesis

Vena publicly positions itself around Excel-native FP&A, governed AI agents, Microsoft-native collaboration, Power BI insights, Teams integration, Azure, and structured workflow controls. This prototype maps that product direction into the CX organization.

The system is designed around four operating beliefs:

- CX AI should live where Vena teams already work: Excel, Teams, Power BI, SharePoint, CRM, and Vena operating playbooks.
- FP&A assistants need source lineage, financial context, and approved decision logic, not generic summarization.
- Sensitive workflow actions should be draft-first, source-linked, audited, and human-approved.
- AI adoption should be run like a measurable pilot portfolio, not a loose backlog of prompts.

Public Vena sources used for alignment:

- [Vena homepage](https://www.venasolutions.com/)
- [Vena AI for Finance](https://www.venasolutions.com/product/copilot)
- [Vena and Microsoft](https://www.venasolutions.com/platform/microsoft)
- [Vena Copilot for Microsoft Teams announcement](https://www.venasolutions.com/newsroom/vena-sets-new-standard-in-agentic-ai-for-fpa-with-microsoft-teams-integration)

## What The Prototype Shows

- A CX AI intake form for new workflow candidates.
- Deterministic scoring by business value, feasibility, risk, urgency, strategic fit, and data sensitivity.
- A governed board across intake, scored, build/QA, and released stages.
- Vena-specific workflow examples for Excel implementation workbooks, Teams adoption briefs, FP&A variance narratives, and enablement answer-bank freshness.
- Source maps for RAG and tool usage.
- Human approval points for sensitive write/send actions.
- QA and evaluation readiness.
- Executive handoff briefs.
- A 90-day pilot roadmap with evidence requirements.
- A delivery architecture for discovery, source grounding, draft-first build, and scale decisions.
- Impact modeling for hours saved, time-to-value movement, adoption readiness, and data-quality lift.

## Demo Walkthrough

Start with the live site: [https://vena-olive.vercel.app](https://vena-olive.vercel.app)

1. Review the portfolio metrics and Vena alignment signals at the top.
2. Add a candidate workflow through the intake form.
3. Filter the board by stage or risk tier.
4. Open a workflow card and inspect the readiness gates.
5. Review the Vena platform fit, source map, tool plan, approvals, QA checklist, release notes, and adoption playbook.
6. Copy the executive handoff brief for the selected workflow.
7. Walk through the 30/60/90 pilot plan and leadership asks.

## Governance Posture

This prototype is intentionally deterministic-first.

- No AI API calls are made at runtime.
- No customer data is stored.
- No external messages are sent.
- No autonomous write/send action is performed.
- No generated image assets are used.
- All sample data is fictional and role-specific.

The prototype is a working demo of an operating cadence, not a claim of production deployment inside Vena.

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
