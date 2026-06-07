import type { AiOpportunity, ApprovalStatus, CheckStatus, KnowledgeSource } from "./types";

const approvalWeight: Record<ApprovalStatus, number> = {
  Required: 0,
  Ready: 0.65,
  Approved: 1
};

const checkWeight: Record<CheckStatus, number> = {
  "Not started": 0,
  "In review": 0.55,
  Passed: 1,
  Blocked: 0
};

const sourceWeight: Record<KnowledgeSource["trust"], number> = {
  High: 1,
  Medium: 0.65,
  "Needs review": 0.25
};

function averageScore(values: number[]): number {
  if (values.length === 0) {
    return 100;
  }

  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100);
}

export function calculateApprovalReadiness(opportunity: AiOpportunity): number {
  return averageScore(opportunity.approvals.map((approval) => approvalWeight[approval.status]));
}

export function calculateQualityReadiness(opportunity: AiOpportunity): number {
  return averageScore(opportunity.qaChecklist.map((check) => checkWeight[check.status]));
}

export function calculateSourceReadiness(opportunity: AiOpportunity): number {
  return averageScore(opportunity.knowledgeSources.map((source) => sourceWeight[source.trust]));
}

export function calculateGovernanceReadiness(opportunity: AiOpportunity): number {
  const approval = calculateApprovalReadiness(opportunity);
  const quality = calculateQualityReadiness(opportunity);
  const source = calculateSourceReadiness(opportunity);
  const adoption = opportunity.impact.adoptionReadiness;

  return Math.round(approval * 0.34 + quality * 0.3 + source * 0.18 + adoption * 0.18);
}

export function countOpenApprovals(opportunity: AiOpportunity): number {
  return opportunity.approvals.filter((approval) => approval.status === "Required").length;
}

export function getNextGate(opportunity: AiOpportunity): string {
  const requiredApproval = opportunity.approvals.find((approval) => approval.status === "Required");

  if (requiredApproval) {
    return `Approval: ${requiredApproval.label}`;
  }

  const blockedCheck = opportunity.qaChecklist.find((check) => check.status === "Blocked");

  if (blockedCheck) {
    return `QA unblock: ${blockedCheck.label}`;
  }

  const activeCheck = opportunity.qaChecklist.find((check) => check.status === "In review");

  if (activeCheck) {
    return `QA review: ${activeCheck.label}`;
  }

  const pendingCheck = opportunity.qaChecklist.find((check) => check.status === "Not started");

  if (pendingCheck) {
    return `QA start: ${pendingCheck.label}`;
  }

  if (opportunity.stage !== "Released") {
    return "Release pilot with named owner";
  }

  return "Measure edits, adoption, and cycle-time movement";
}

export function buildExecutiveBrief(opportunity: AiOpportunity): string {
  const readiness = calculateGovernanceReadiness(opportunity);
  const openApprovals = countOpenApprovals(opportunity);
  const topSources = opportunity.knowledgeSources
    .slice(0, 2)
    .map((source) => source.name)
    .join(", ");

  return [
    `${opportunity.title}`,
    `Owner: ${opportunity.owner}`,
    `CX area: ${opportunity.cxArea}`,
    `Priority: ${opportunity.scores.priority}/100 | Risk: ${opportunity.scores.tier} | Governance readiness: ${readiness}/100`,
    `Current gate: ${getNextGate(opportunity)}`,
    `Open approvals: ${openApprovals}`,
    `Trusted inputs: ${topSources || "Source map pending"}`,
    `Action boundary: Draft, route, or prepare work only; human owner approves sensitive write/send steps.`,
    `Impact model: ${opportunity.impact.hoursSavedPerWeek} hrs/week saved, ${opportunity.impact.timeToValueDays} day time-to-value shift.`
  ].join("\n");
}
