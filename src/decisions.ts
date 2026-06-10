import type { AiOpportunity } from "./types";

export const DECISION_TYPES = ["Fund", "Hold", "Scale", "Pause", "Retire"] as const;

export type DecisionType = (typeof DECISION_TYPES)[number];

export const REVIEW_WINDOWS = ["1 week", "2 weeks", "30 days", "90 days"] as const;

export type ReviewWindow = (typeof REVIEW_WINDOWS)[number];

export interface DecisionRecord {
  id: string;
  workflowId: string;
  decision: DecisionType;
  owner: string;
  date: string;
  reason: string;
  evidenceRequired: string;
  nextReviewWindow: ReviewWindow;
}

export interface DecisionDraft {
  workflowId: string;
  decision: DecisionType;
  owner: string;
  date: string;
  reason: string;
  evidenceRequired: string;
  nextReviewWindow: ReviewWindow;
}

export interface PortfolioDecisionSummary {
  decidedWorkflows: number;
  undecidedWorkflows: number;
  counts: Record<DecisionType, number>;
  latestDecisions: Array<{ workflowTitle: string; record: DecisionRecord }>;
}

function isDecisionType(value: unknown): value is DecisionType {
  return DECISION_TYPES.includes(value as DecisionType);
}

function isReviewWindow(value: unknown): value is ReviewWindow {
  return REVIEW_WINDOWS.includes(value as ReviewWindow);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function createDecisionRecord(draft: DecisionDraft, sequence: number): DecisionRecord | null {
  if (!isDecisionType(draft.decision) || !isReviewWindow(draft.nextReviewWindow)) {
    return null;
  }

  if (!isNonEmptyString(draft.workflowId) || !isNonEmptyString(draft.owner) || !isNonEmptyString(draft.reason)) {
    return null;
  }

  if (!isNonEmptyString(draft.date)) {
    return null;
  }

  return {
    id: `decision-${String(sequence).padStart(3, "0")}-${draft.workflowId}`,
    workflowId: draft.workflowId,
    decision: draft.decision,
    owner: draft.owner.trim(),
    date: draft.date.trim(),
    reason: draft.reason.trim(),
    evidenceRequired: draft.evidenceRequired.trim() || "Owner-reviewed usage, edit, and control evidence.",
    nextReviewWindow: draft.nextReviewWindow
  };
}

export function decisionsForWorkflow(records: DecisionRecord[], workflowId: string): DecisionRecord[] {
  return records.filter((record) => record.workflowId === workflowId);
}

export function latestDecisionForWorkflow(records: DecisionRecord[], workflowId: string): DecisionRecord | null {
  return decisionsForWorkflow(records, workflowId)[0] ?? null;
}

export function summarizeDecisionPosture(
  opportunities: AiOpportunity[],
  records: DecisionRecord[]
): PortfolioDecisionSummary {
  const counts: Record<DecisionType, number> = { Fund: 0, Hold: 0, Scale: 0, Pause: 0, Retire: 0 };
  const latestDecisions: Array<{ workflowTitle: string; record: DecisionRecord }> = [];

  for (const opportunity of opportunities) {
    const latest = latestDecisionForWorkflow(records, opportunity.id);

    if (latest) {
      counts[latest.decision] += 1;
      latestDecisions.push({ workflowTitle: opportunity.title, record: latest });
    }
  }

  return {
    decidedWorkflows: latestDecisions.length,
    undecidedWorkflows: Math.max(0, opportunities.length - latestDecisions.length),
    counts,
    latestDecisions
  };
}

export function describeDecision(record: DecisionRecord): string {
  return `${record.decision} (${record.date}, ${record.owner}). Reason: ${record.reason}. Evidence: ${record.evidenceRequired}. Next review: ${record.nextReviewWindow}.`;
}

export function sanitizeDecisionRecords(raw: unknown): DecisionRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const records: DecisionRecord[] = [];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const candidate = entry as Record<string, unknown>;

    if (
      isNonEmptyString(candidate.id) &&
      isNonEmptyString(candidate.workflowId) &&
      isDecisionType(candidate.decision) &&
      isNonEmptyString(candidate.owner) &&
      isNonEmptyString(candidate.date) &&
      isNonEmptyString(candidate.reason) &&
      isNonEmptyString(candidate.evidenceRequired) &&
      isReviewWindow(candidate.nextReviewWindow)
    ) {
      records.push({
        id: candidate.id,
        workflowId: candidate.workflowId,
        decision: candidate.decision,
        owner: candidate.owner,
        date: candidate.date,
        reason: candidate.reason,
        evidenceRequired: candidate.evidenceRequired,
        nextReviewWindow: candidate.nextReviewWindow
      });
    }
  }

  return records;
}
