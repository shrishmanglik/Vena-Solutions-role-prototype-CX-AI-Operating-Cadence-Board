import type { CxArea } from "./types";

export interface AlignmentSignal {
  label: string;
  headline: string;
  body: string;
  proof: string;
}

export interface ArchitectureLane {
  step: string;
  title: string;
  owner: string;
  inputs: string[];
  controls: string[];
  outcome: string;
}

export interface PilotMilestone {
  window: string;
  focus: string;
  outcome: string;
  proof: string;
  owner: string;
}

export const alignmentSignals: AlignmentSignal[] = [
  {
    label: "Microsoft-native CX",
    headline: "Put AI where Vena teams already plan, meet, and review",
    body:
      "Workflow patterns are shaped around Excel, Teams, Power BI, SharePoint, and CRM handoffs instead of a separate AI workbench.",
    proof: "Vena positions its platform around Microsoft 365, Excel, Teams, Power BI, Azure, and Dynamics integrations."
  },
  {
    label: "FP&A context",
    headline: "Ground every assistant in planning models and decision logic",
    body:
      "The backlog favors source-linked summaries, variance narratives, adoption briefs, and workbook checks that preserve financial context.",
    proof: "Vena describes governed AI agents for planning, reporting, forecasting, analysis, and workflow orchestration."
  },
  {
    label: "Governed adoption",
    headline: "Ship draft-first assistants with owner gates and release evidence",
    body:
      "Every use case carries approvals, QA checks, source trust, audit events, release notes, and adoption plays before it scales.",
    proof: "Vena emphasizes structured workflows, approvals, version control, auditability, permissions, and human oversight."
  },
  {
    label: "CX operating rhythm",
    headline: "Turn CX friction into a measurable pilot portfolio",
    body:
      "Services, adoption, managed services, and enablement work share one cadence for intake, scoring, build readiness, release, and impact review.",
    proof: "The role needs someone who can bridge business pain, AI design, technical delivery, governance, and adoption."
  }
];

export const architectureLanes: ArchitectureLane[] = [
  {
    step: "01",
    title: "Discover and qualify",
    owner: "CX AI Architect + business owner",
    inputs: ["CX pain point", "workflow volume", "data sensitivity", "current owner"],
    controls: ["named sponsor", "source classification", "success metric"],
    outcome: "Scored opportunity with a clear next gate"
  },
  {
    step: "02",
    title: "Ground in approved sources",
    owner: "CX ops + data owner",
    inputs: ["Excel workbooks", "Power BI views", "Teams notes", "playbooks"],
    controls: ["source trust", "field allowlist", "freshness check"],
    outcome: "RAG and tool plan ready for QA"
  },
  {
    step: "03",
    title: "Build draft-first workflows",
    owner: "AI builder + process owner",
    inputs: ["prompt contract", "fixtures", "approval rules", "rollback path"],
    controls: ["human review", "audit log", "no autonomous send/write"],
    outcome: "Pilot workflow ready for gated release"
  },
  {
    step: "04",
    title: "Measure and scale",
    owner: "CX leadership + pilot leads",
    inputs: ["usage", "edits", "cycle time", "quality feedback"],
    controls: ["weekly review", "risk burn-down", "owner sign-off"],
    outcome: "Evidence-backed decision to expand, pause, or retire"
  }
];

export const pilotRoadmap: PilotMilestone[] = [
  {
    window: "Days 0-30",
    focus: "Pilot foundation",
    outcome: "Select 2 high-value workflows, confirm data boundaries, and publish the release contract.",
    proof: "Source map, approval map, fixtures, and success metrics accepted by CX and IT/Security.",
    owner: "CX AI Architect"
  },
  {
    window: "Days 31-60",
    focus: "Gated production pilot",
    outcome: "Launch draft-first workflows to named services and adoption cohorts with weekly governance review.",
    proof: "At least 25 uses, edit reasons tagged, no unresolved sensitive-action exceptions.",
    owner: "Pilot owners"
  },
  {
    window: "Days 61-90",
    focus: "Scale decision",
    outcome: "Promote, pause, or retire each workflow using impact, adoption, quality, and control evidence.",
    proof: "Cycle-time movement, hours saved, source-quality lift, and release-readiness score reviewed by leadership.",
    owner: "CX leadership"
  }
];

export const executiveAsks = [
  "Name one CX executive sponsor for prioritization and escalation.",
  "Assign source owners for Excel, Power BI, Teams, CRM, and knowledge-base inputs.",
  "Approve a draft-first pilot policy: no customer-facing send/write without human owner approval.",
  "Hold a 30-minute weekly governance review for pilot evidence and risk burn-down."
];

export const platformFitByArea: Record<CxArea, string[]> = {
  "Professional Services": [
    "Excel-native implementation workbooks stay the system of work instead of being replaced.",
    "Teams kickoff notes become reviewed context, not an unmanaged prompt dump.",
    "SharePoint and CRM handoffs keep source lineage and owner accountability visible.",
    "Pilot value is measured through implementation risk clarity, consultant edits, and time-to-value movement."
  ],
  "Customer Adoption": [
    "Power BI adoption signals feed account prep without inventing unsupported health-score claims.",
    "Teams meeting prep can surface risks and next actions where adoption managers already collaborate.",
    "CRM updates remain drafted until the customer owner approves the account narrative.",
    "Pilot value is measured through brief reuse, manager edits, and renewal-risk action completion."
  ],
  "Managed Services": [
    "Excel and planning exports remain tied to source rows for recurring variance commentary.",
    "Power BI management views provide trend context while templates preserve approved language.",
    "Service-lead review gates protect customer-facing narratives from unsupported analysis.",
    "Pilot value is measured through close-cycle time, reviewer edits, and narrative reuse."
  ],
  "Customer Enablement": [
    "Knowledge-base and release-note sources become a governed freshness queue.",
    "Teams question patterns help identify enablement gaps without auto-publishing content.",
    "Owner routing turns stale answers into measurable tasks instead of informal cleanup work.",
    "Pilot value is measured through stale-content closure, false-positive rate, and answer reuse."
  ]
};
