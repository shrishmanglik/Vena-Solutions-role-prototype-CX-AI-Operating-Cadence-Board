import type { AiOpportunity, ApprovalStatus, CheckStatus, KnowledgeSource } from "./types";

function withAudit(opportunity: AiOpportunity, actor: string, timestamp: string, event: string): AiOpportunity {
  return {
    ...opportunity,
    auditLog: [
      {
        timestamp,
        actor,
        event
      },
      ...opportunity.auditLog
    ]
  };
}

export function clearWorkflowActionState(workflowId: string, actionIds: string[]): string[] {
  const prefix = `${workflowId}-`;

  return actionIds.filter((id) => !id.startsWith(prefix));
}

export function updateApprovalStatus(
  opportunity: AiOpportunity,
  index: number,
  status: ApprovalStatus,
  actor: string,
  timestamp: string
): AiOpportunity {
  const approval = opportunity.approvals[index];

  if (!approval || approval.status === status) {
    return opportunity;
  }

  const approvals = opportunity.approvals.map((item, itemIndex) =>
    itemIndex === index ? { ...item, status } : item
  );

  return withAudit(
    { ...opportunity, approvals },
    actor,
    timestamp,
    `Approval updated: ${approval.label} moved from ${approval.status} to ${status}`
  );
}

export function updateQualityCheckStatus(
  opportunity: AiOpportunity,
  index: number,
  status: CheckStatus,
  actor: string,
  timestamp: string
): AiOpportunity {
  const check = opportunity.qaChecklist[index];

  if (!check || check.status === status) {
    return opportunity;
  }

  const qaChecklist = opportunity.qaChecklist.map((item, itemIndex) =>
    itemIndex === index ? { ...item, status } : item
  );

  return withAudit(
    { ...opportunity, qaChecklist },
    actor,
    timestamp,
    `QA evidence updated: ${check.label} moved from ${check.status} to ${status}`
  );
}

export function updateSourceTrust(
  opportunity: AiOpportunity,
  index: number,
  trust: KnowledgeSource["trust"],
  actor: string,
  timestamp: string
): AiOpportunity {
  const source = opportunity.knowledgeSources[index];

  if (!source || source.trust === trust) {
    return opportunity;
  }

  const knowledgeSources = opportunity.knowledgeSources.map((item, itemIndex) =>
    itemIndex === index ? { ...item, trust } : item
  );

  return withAudit(
    { ...opportunity, knowledgeSources },
    actor,
    timestamp,
    `Source trust updated: ${source.name} moved from ${source.trust} to ${trust}`
  );
}
