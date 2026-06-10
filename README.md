# Vena CX AI Portfolio Operating System

Role-specific prototype for the **Vena Solutions Customer Experience AI Architect** application.

Live website: [https://vena-olive.vercel.app](https://vena-olive.vercel.app)
GitHub repository: [https://github.com/shrishmanglik/Vena-Solutions-role-prototype-CX-AI-Operating-Cadence-Board](https://github.com/shrishmanglik/Vena-Solutions-role-prototype-CX-AI-Operating-Cadence-Board)

## Executive Summary

This is a working prototype of a governed CX AI portfolio operating system for Vena. It turns post-sales AI ideas into a portfolio that can be owned, scored, funded, built, reviewed, released, decided on, and measured across Professional Services, Customer Adoption, Managed Services, and Customer Enablement.

The goal is not to simulate an AI chatbot. The goal is to show the operating system a Customer Experience AI Architect would need at Vena: choose the right workflows, ground them in trusted business sources, keep Microsoft-native work habits intact, enforce human approval gates, assign weekly actions, record explicit fund/hold/scale/pause/retire decisions, and prove pilot value with economics and evidence.

Version 2.1 adds an enterprise-readiness control tower on top of the operating workflow: leadership can see whether the portfolio is actually ready to fund, scale, or hold based on value case, governance, evidence, adoption, and operating discipline.

## Client POV Review

From a Vena leadership perspective, the most useful version of this product is not a large dashboard. It is a weekly operating surface that answers six practical questions:

1. What should we fund?
2. What is blocked?
3. Who owns the next action?
4. What value is at stake?
5. What evidence proves this is safe and useful enough to scale?
6. Which workflows should scale, pause, or retire — and who made that call?
7. Is this portfolio enterprise-ready enough to sponsor, or does it still need evidence and control work?

The 2.1 refinement turns the prototype from a presentation artifact into software a CX leadership team could pilot internally: state persists, actions complete and snooze, decisions are recorded with owners and review windows, enterprise readiness is scored transparently, and the weekly board packet is one click away.

## Why Vena Would Care

Vena publicly positions itself around Excel-native FP&A, governed AI agents, Microsoft-native collaboration, Power BI insights, Teams integration, Azure, and structured workflow controls. This prototype maps that product direction into the CX organization.

The system is designed around five operating beliefs:

- CX AI should live where Vena teams already work: Excel, Teams, Power BI, SharePoint, CRM, and Vena operating playbooks.
- FP&A assistants need source lineage, financial context, and approved decision logic, not generic summarization.
- Sensitive workflow actions should be draft-first, source-linked, audited, and human-approved.
- AI adoption should be run like a measurable pilot portfolio with explicit decisions, not a loose backlog of prompts.
- Executive sponsorship should be earned with a clear value model, payback view, investment gates, and a copy-ready business case.

Public Vena sources used for alignment:

- [Vena homepage](https://www.venasolutions.com/)
- [Vena AI for Finance](https://www.venasolutions.com/product/copilot)
- [Vena and Microsoft](https://www.venasolutions.com/platform/microsoft)
- [Vena Copilot for Microsoft Teams announcement](https://www.venasolutions.com/newsroom/vena-sets-new-standard-in-agentic-ai-for-fpa-with-microsoft-teams-integration)

## Feature List

### Enterprise readiness control tower (new in 2.1)

- Scores the portfolio across five executive dimensions: value case, governance, evidence, adoption, and operating discipline.
- Converts readiness into a clear Ready / Watch / Blocked posture with next moves per dimension.
- Surfaces the readiness score in the top metric strip, the Executive tab, and the weekly board packet.
- Makes the fund/hold/scale conversation explicit: a high ROI case still cannot hide weak evidence, open approvals, or missing decisions.

### Operating state (new in 2.0)

- Local persistence: added workflows, stage changes, decisions, action states, assumptions, scenario, selected workflow, and active tab survive a refresh.
- Defensive state migration: corrupted or outdated saved data is discarded slice-by-slice instead of crashing the app.
- One-click "Reset demo data" control to return to the seeded portfolio.

### Decision records (new in 2.0)

- Fund / Hold / Scale / Pause / Retire decisions per workflow with owner, date, reason, required evidence, and next review window.
- Decision history per workflow, decision pill on board cards and the workflow header, and an audit-log entry per decision.
- Portfolio-level decision summary on the Executive tab and latest decisions in the board packet and executive handoff brief.

### Operational action queue (upgraded in 2.0)

- Severity and owner filters.
- Mark done, snooze, restore, and reopen — with a compact "completed this week" section so cleared work stays visible.
- Urgent count and blocked value at stake across open critical/high actions.
- Top 5 open actions surfaced on the Executive tab.

### Scenario planner (new in 2.0)

- Conservative / Base / Aggressive presets that set loaded CX cost, rollout scale, adoption coverage, pilot investment, and delay cost per day.
- Slider edits automatically flag the scenario as Custom; economics recalculate immediately.
- The active scenario name is stamped into the business-case memo and board packet.

### Board packet (upgraded in 2.1)

- "Copy weekly board packet" produces clipboard text with the portfolio value summary, enterprise readiness score, ROI/payback/confidence, top 3 scale candidates, critical blockers, weekly agenda, latest workflow decisions, and the non-negotiable control boundary.
- Every section handles empty states explicitly.

### Core portfolio system

- A CX AI intake form for new workflow candidates with deterministic scoring by business value, feasibility, risk, urgency, strategic fit, and data sensitivity.
- A deterministic executive business-case engine with modeled annual value, ROI multiple, payback, confidence, and scale assumptions.
- A governed board across intake, scored, build/QA, and released stages with stage and risk filters.
- Vena-specific workflow examples for Excel implementation workbooks, Teams adoption briefs, FP&A variance narratives, and enablement answer-bank freshness.
- Source maps for RAG and tool usage, human approval points, QA/evaluation readiness, release notes, adoption playbooks, impact modeling, and audit logs.
- A 90-day pilot roadmap with evidence requirements, delivery architecture, and investment gates.

## How To Use Each Tab

### Executive Tab

- Review modeled annual value, ROI, payback, confidence, capacity, and enterprise readiness.
- Switch between Conservative, Base, and Aggressive scenarios, or fine-tune assumptions with the sliders.
- Work the weekly action queue: filter by severity or owner, mark actions done, snooze to next review, and watch blocked value at stake.
- Review the portfolio decision summary: what has been decided, what is pending.
- Copy the board-ready business case memo or the full weekly board packet.

### Portfolio Tab

- Add new AI workflow ideas through intake.
- Filter the backlog by stage or risk tier; cards show the latest decision where one exists.
- Select a card to inspect the workflow in detail.

### Pilot Tab

- Review why the approach fits Vena's Microsoft-native FP&A context.
- Inspect the delivery architecture from discovery through source grounding, build, and scale.
- Use the 30/60/90 roadmap and leadership asks to plan a controlled pilot.

### Workflow Tab

- Review the selected workflow's readiness gates, source map, tool plan, approvals, QA checks, release notes, adoption playbook, impact model, and audit log.
- Move the workflow across intake, scored, build/QA, and released stages.
- Record a Fund / Hold / Scale / Pause / Retire decision with owner, reason, evidence required, and next review window; review the full decision history.
- Copy the workflow-specific executive handoff brief, which includes the latest decision.

## Weekly Operating Review Workflow

1. Open the Executive tab and confirm the scenario (Conservative / Base / Aggressive) for the conversation.
2. Read the weekly action queue: clear or assign every critical and high action; snooze only with a reason.
3. Review enterprise readiness, blocked value at stake, and open approval gates.
4. For each workflow due for review, open the Workflow tab and record the decision with owner and evidence required.
5. Copy the weekly board packet and paste it into the leadership channel or meeting notes.
6. Reset filters, confirm next review windows, and close the meeting with every action owned.

## Governance Posture

This prototype is intentionally deterministic-first.

- No AI API calls are made at runtime.
- No customer data is stored; all state is fictional sample data persisted only in the viewer's own browser (localStorage).
- No external messages are sent.
- No autonomous write/send action is performed.
- No generated image assets are used.
- All sample data is fictional and role-specific.

The prototype is a working demo of an operating cadence, not a claim of production deployment inside Vena.

## Tech Stack

- React 19
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
npm audit
```

Verification coverage includes deterministic scoring, governance readiness, enterprise-readiness scoring, strategy layer, portfolio economics, scenario planner economics, decision-record validation and summaries, action-queue completion/snooze state, board-packet content and empty states, and persistence round-trips with corrupted-data handling.

An additional policy scan confirms no image assets or runtime AI calls:

```bash
rg -n "gpt-image|image_gen|\.png|\.jpg|\.jpeg|\.webp|\.gif|\.svg|<img|background-image|url\(" . --glob '!node_modules/**' --glob '!dist/**' --glob '!package-lock.json'
```

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
2. Run `npm run test`, `npm run typecheck`, `npm run build`, and `npm audit`.
3. Run the image/asset policy scan above.
4. Confirm no private application documents are staged.
5. Commit with a conventional message.
6. Push to `main` on [the GitHub repository](https://github.com/shrishmanglik/Vena-Solutions-role-prototype-CX-AI-Operating-Cadence-Board).
7. Redeploy to Vercel when the website behavior or UI changes.
8. Smoke-test [https://vena-olive.vercel.app](https://vena-olive.vercel.app) after deployment.

Private application files such as resumes, cover letters, job-description analysis, and PDFs remain local-only and are excluded by `.gitignore`.

## Known Limitations

- State lives in the viewer's browser only; there is no backend, multi-user sync, or authentication. Two people see two different portfolios.
- Operating actions are derived deterministically from workflow state; completing an action does not change the underlying approval or QA status (those are sample data).
- Economics are a planning model with fictional inputs, not measured telemetry.
- Snooze is a "until next review" toggle, not a timed reminder.
- Copy buttons require browser clipboard permission and a focused document; the UI reports failure rather than silently dropping.

## Future Roadmap

- Evidence capture per decision: attach usage counts, edit-reason tags, and QA results to each review window.
- Approval and QA status editing with role-based gates, so the action queue closes itself from real state changes.
- Import/export of portfolio state as JSON for sharing between reviewers.
- A read-only "board view" link that renders the packet as a page.
- Optional Teams webhook (behind explicit approval) to post the weekly packet where leadership already works.
