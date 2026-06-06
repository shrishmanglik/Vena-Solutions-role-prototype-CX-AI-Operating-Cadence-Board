import type { AiOpportunity, IntakeDraft, WorkflowStage } from "./types";
import { calculateOpportunityScores } from "./scoring";

export const STAGES: WorkflowStage[] = ["Intake", "Scored", "Build / QA", "Released"];

export const seedOpportunities: AiOpportunity[] = [
  {
    id: "cx-001",
    title: "Implementation kickoff workbook analyzer",
    cxArea: "Professional Services",
    owner: "PS Operations",
    stage: "Build / QA",
    painPoint:
      "Consultants lose time translating kickoff workbooks into implementation risks, owner tasks, and next-step notes.",
    workflowVolume: 44,
    sensitivity: "Sensitive",
    scores: calculateOpportunityScores({
      value: 88,
      feasibility: 74,
      risk: 58,
      strategicAlignment: 92,
      urgency: 80,
      sensitivity: "Sensitive"
    }),
    knowledgeSources: [
      { name: "Implementation playbooks", owner: "Professional Services", trust: "High" },
      { name: "Kickoff workbook schema", owner: "PS Operations", trust: "High" },
      { name: "Customer-specific notes", owner: "Consultant owner", trust: "Needs review" }
    ],
    integrationPlan: [
      {
        system: "SharePoint",
        action: "Read approved workbook fields only",
        approval: "Consultant confirms customer context before draft generation"
      },
      {
        system: "CRM",
        action: "Attach implementation risk summary",
        approval: "No CRM write until PS owner approves"
      }
    ],
    approvals: [
      { label: "Security data sensitivity review", owner: "IT Security", status: "Ready" },
      { label: "PS owner release approval", owner: "PS Operations", status: "Required" },
      { label: "Customer-facing language review", owner: "Implementation lead", status: "Required" }
    ],
    qaChecklist: [
      { label: "Golden kickoff workbook fixtures pass", status: "Passed" },
      { label: "PII redaction smoke test", status: "Passed" },
      { label: "Consultant edit path verified", status: "In review" },
      { label: "Rollback and audit log checked", status: "In review" }
    ],
    releaseNotes: [
      "Release behind PS pilot group only.",
      "Draft output must show source fields and confidence gaps.",
      "All customer-facing notes require consultant approval."
    ],
    adoptionPlaybook: [
      "Run a 30-minute consultant enablement session.",
      "Add before/after walkthrough to kickoff checklist.",
      "Review pilot feedback after five kickoff packages."
    ],
    impact: {
      hoursSavedPerWeek: 18,
      timeToValueDays: 4,
      adoptionReadiness: 76,
      dataQualityLift: 68
    },
    auditLog: [
      { timestamp: "2026-06-05 09:10", actor: "PS Ops", event: "Use case accepted into build queue" },
      { timestamp: "2026-06-05 13:45", actor: "IT Security", event: "Sensitive data review requested" },
      { timestamp: "2026-06-06 10:20", actor: "QA", event: "Golden fixture pass recorded" }
    ]
  },
  {
    id: "cx-002",
    title: "Adoption risk brief copilot",
    cxArea: "Customer Adoption",
    owner: "Customer Adoption Manager",
    stage: "Scored",
    painPoint:
      "Adoption owners need a faster way to convert usage signals, open tasks, and renewal context into a reviewed account brief.",
    workflowVolume: 62,
    sensitivity: "Moderate",
    scores: calculateOpportunityScores({
      value: 82,
      feasibility: 81,
      risk: 42,
      strategicAlignment: 86,
      urgency: 72,
      sensitivity: "Moderate"
    }),
    knowledgeSources: [
      { name: "Usage summary export", owner: "Data team", trust: "Medium" },
      { name: "Adoption playbook", owner: "Customer Adoption", trust: "High" },
      { name: "Renewal notes", owner: "Account team", trust: "Needs review" }
    ],
    integrationPlan: [
      {
        system: "Power BI",
        action: "Read usage trend and adoption segment",
        approval: "Data owner validates metric definitions"
      },
      {
        system: "CRM",
        action: "Prepare private account brief",
        approval: "CAM approves before sharing externally"
      }
    ],
    approvals: [
      { label: "Metric definition owner", owner: "Data team", status: "Ready" },
      { label: "CAM customer-share approval", owner: "Customer Adoption", status: "Required" }
    ],
    qaChecklist: [
      { label: "Usage trend null-state covered", status: "Passed" },
      { label: "No unsupported health-score claims", status: "In review" },
      { label: "Owner handoff checklist attached", status: "Not started" }
    ],
    releaseNotes: [
      "Start as internal account-prep assist.",
      "Do not send customer communication autonomously.",
      "Track brief adoption and manager edits."
    ],
    adoptionPlaybook: [
      "Pilot with three adoption managers.",
      "Review edit reasons weekly.",
      "Promote only after source trust improves."
    ],
    impact: {
      hoursSavedPerWeek: 22,
      timeToValueDays: 6,
      adoptionReadiness: 70,
      dataQualityLift: 54
    },
    auditLog: [
      { timestamp: "2026-06-05 11:30", actor: "CAM", event: "Inbound request scored" },
      { timestamp: "2026-06-05 15:20", actor: "Data", event: "Metric definitions assigned" }
    ]
  },
  {
    id: "cx-003",
    title: "Managed Services variance narrative draft",
    cxArea: "Managed Services",
    owner: "Managed Services Lead",
    stage: "Released",
    painPoint:
      "Analysts need a repeatable first draft for recurring variance commentary that stays tied to source rows and reviewer notes.",
    workflowVolume: 38,
    sensitivity: "Moderate",
    scores: calculateOpportunityScores({
      value: 76,
      feasibility: 84,
      risk: 34,
      strategicAlignment: 79,
      urgency: 64,
      sensitivity: "Moderate"
    }),
    knowledgeSources: [
      { name: "Approved variance templates", owner: "Managed Services", trust: "High" },
      { name: "Planning exports", owner: "Customer admin", trust: "Medium" },
      { name: "Reviewer notes", owner: "Service lead", trust: "High" }
    ],
    integrationPlan: [
      {
        system: "Planning export",
        action: "Read variance rows and dimensional context",
        approval: "Analyst confirms source export is current"
      },
      {
        system: "Customer communication draft",
        action: "Copy reviewed narrative only",
        approval: "Service lead approves final text"
      }
    ],
    approvals: [
      { label: "Template owner approval", owner: "Managed Services", status: "Approved" },
      { label: "Reviewer sign-off", owner: "Service lead", status: "Approved" }
    ],
    qaChecklist: [
      { label: "Source-row citation test", status: "Passed" },
      { label: "Human review required", status: "Passed" },
      { label: "Release notes delivered", status: "Passed" }
    ],
    releaseNotes: [
      "Released to internal analysts.",
      "Narratives remain drafts until reviewer approval.",
      "Weekly impact review tracks edits and reuse."
    ],
    adoptionPlaybook: [
      "Add to Managed Services monthly close routine.",
      "Review common edits every Friday.",
      "Update templates only after owner approval."
    ],
    impact: {
      hoursSavedPerWeek: 15,
      timeToValueDays: 3,
      adoptionReadiness: 84,
      dataQualityLift: 61
    },
    auditLog: [
      { timestamp: "2026-06-04 16:00", actor: "Managed Services", event: "Pilot release approved" },
      { timestamp: "2026-06-05 08:40", actor: "Service lead", event: "First review cycle completed" }
    ]
  },
  {
    id: "cx-004",
    title: "Enablement answer-bank review loop",
    cxArea: "Customer Enablement",
    owner: "Enablement Manager",
    stage: "Intake",
    painPoint:
      "Enablement teams need a governed way to find stale answer-bank content and route edits back to the correct owner.",
    workflowVolume: 28,
    sensitivity: "Low",
    scores: calculateOpportunityScores({
      value: 68,
      feasibility: 78,
      risk: 29,
      strategicAlignment: 74,
      urgency: 55,
      sensitivity: "Low"
    }),
    knowledgeSources: [
      { name: "Enablement answer bank", owner: "Customer Enablement", trust: "Medium" },
      { name: "Product release notes", owner: "Product", trust: "High" },
      { name: "Support macro usage", owner: "Support Ops", trust: "Medium" }
    ],
    integrationPlan: [
      {
        system: "Knowledge base",
        action: "Flag candidate stale entries",
        approval: "Content owner reviews before edit"
      },
      {
        system: "Task queue",
        action: "Create owner review task",
        approval: "Enablement manager confirms owner mapping"
      }
    ],
    approvals: [
      { label: "Knowledge owner mapping", owner: "Enablement Manager", status: "Required" },
      { label: "Product release source review", owner: "Product", status: "Required" }
    ],
    qaChecklist: [
      { label: "False-positive review sample", status: "Not started" },
      { label: "Owner routing test", status: "Not started" },
      { label: "No auto-publish guard", status: "Passed" }
    ],
    releaseNotes: [
      "Keep in intake until owner map is trusted.",
      "No content edits are published by automation.",
      "Measure stale-content closure rate."
    ],
    adoptionPlaybook: [
      "Review sample stale flags with enablement leads.",
      "Publish owner-routing SLA.",
      "Add weekly stale-content queue review."
    ],
    impact: {
      hoursSavedPerWeek: 9,
      timeToValueDays: 9,
      adoptionReadiness: 58,
      dataQualityLift: 72
    },
    auditLog: [
      { timestamp: "2026-06-05 17:25", actor: "Enablement", event: "Use case drafted" }
    ]
  }
];

export function createOpportunityFromDraft(draft: IntakeDraft, sequence: number): AiOpportunity {
  const id = `cx-new-${String(sequence).padStart(3, "0")}`;
  const scores = calculateOpportunityScores(draft);
  const approvalStatus = draft.sensitiveActionApproval || draft.sensitivity !== "Low" ? "Required" : "Ready";

  return {
    id,
    title: draft.title.trim() || "Untitled CX AI workflow",
    cxArea: draft.cxArea,
    owner: draft.owner.trim() || "Unassigned owner",
    stage: "Intake",
    painPoint: draft.painPoint.trim() || "Pain point pending discovery.",
    workflowVolume: draft.workflowVolume,
    sensitivity: draft.sensitivity,
    scores,
    knowledgeSources: [
      { name: `${draft.cxArea} process source`, owner: draft.owner || draft.cxArea, trust: "Needs review" },
      { name: "Approved playbook or SOP", owner: draft.cxArea, trust: "Medium" },
      { name: "Customer or workflow notes", owner: "Business owner", trust: "Needs review" }
    ],
    integrationPlan: [
      {
        system: "Source system export",
        action: "Read approved fields only",
        approval: "Business owner confirms source freshness"
      },
      {
        system: "Workflow action",
        action: "Prepare draft or task, never autonomous release",
        approval: "Human owner approves before write/send"
      }
    ],
    approvals: [
      { label: "Business owner acceptance", owner: draft.owner || "Business owner", status: "Required" },
      { label: "Security and data sensitivity review", owner: "IT Security", status: approvalStatus }
    ],
    qaChecklist: [
      { label: "Golden fixture defined", status: "Not started" },
      { label: "Source citation visible", status: "Not started" },
      { label: "Human approval point verified", status: "Not started" },
      { label: "Rollback and audit log path documented", status: "Not started" }
    ],
    releaseNotes: [
      "Pilot with named business owner before broad release.",
      "Keep generated output as draft until approval.",
      "Measure adoption, edits, and cycle-time movement."
    ],
    adoptionPlaybook: [
      "Identify first pilot cohort.",
      "Run enablement walkthrough.",
      "Review feedback after the first five uses."
    ],
    impact: {
      hoursSavedPerWeek: Math.max(4, Math.round(draft.workflowVolume * (draft.value / 100) * 0.35)),
      timeToValueDays: Math.max(2, Math.round(12 - draft.feasibility / 12)),
      adoptionReadiness: Math.max(35, Math.round((draft.feasibility + draft.strategicAlignment) / 2)),
      dataQualityLift: Math.max(20, Math.round(100 - draft.risk * 0.55))
    },
    auditLog: [
      {
        timestamp: "2026-06-06 10:30",
        actor: draft.owner || "Business owner",
        event: "Intake draft created in prototype"
      }
    ]
  };
}
