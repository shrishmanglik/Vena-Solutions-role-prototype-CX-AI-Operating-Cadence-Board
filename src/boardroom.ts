import { latestDecisionForWorkflow } from "./decisions";
import type { BoardPacketInput } from "./boardPacket";
import { CONTROL_BOUNDARY } from "./boardPacket";
import { formatCurrency } from "./portfolio";

export interface BoardroomMetric {
  label: string;
  value: string;
  helper: string;
}

export interface BoardroomSectionItem {
  primary: string;
  secondary: string;
  meta: string;
}

export interface BoardroomSection {
  title: string;
  emptyState: string;
  items: BoardroomSectionItem[];
}

export interface BoardroomView {
  decision: string;
  posture: string;
  metrics: BoardroomMetric[];
  sections: BoardroomSection[];
  controlBoundary: string;
}

function buildDecision(input: BoardPacketInput): string {
  if (input.opportunities.length === 0) {
    return "Run intake before asking leadership for funding.";
  }

  if (!input.enterpriseReadiness) {
    return "Hold broad scale until enterprise readiness is calculated.";
  }

  if (input.enterpriseReadiness.status === "Ready" && input.economics.roiMultiple >= 3) {
    return "Fund the controlled CX AI pilot and prepare the top workflows for scale review.";
  }

  if (input.enterpriseReadiness.status === "Blocked") {
    return "Do not scale yet. Clear governance, evidence, or operating blockers first.";
  }

  return "Fund selectively while leadership clears the watchlist before broad rollout.";
}

function buildPosture(input: BoardPacketInput): string {
  const readiness = input.enterpriseReadiness
    ? `${input.enterpriseReadiness.overallScore}/100 ${input.enterpriseReadiness.status}`
    : "readiness pending";

  return `${input.scenarioName} scenario | ${readiness} | ${input.economics.roiMultiple}x ROI | ${input.economics.paybackMonths} month payback`;
}

export function buildBoardroomView(input: BoardPacketInput): BoardroomView {
  const criticalOrHighActions = input.openActions.filter(
    (action) => action.severity === "Critical" || action.severity === "High"
  );
  const readinessItems =
    input.enterpriseReadiness?.dimensions.map((dimension) => ({
      primary: `${dimension.label}: ${dimension.score}/100 (${dimension.status})`,
      secondary: dimension.signal,
      meta: dimension.nextMove
    })) ?? [];
  const scaleItems = input.contributors.slice(0, 3).map((candidate) => ({
    primary: candidate.title,
    secondary: `${formatCurrency(candidate.contribution)} modeled value`,
    meta: candidate.nextGate
  }));
  const blockerItems = criticalOrHighActions.slice(0, 5).map((action) => ({
    primary: action.action,
    secondary: `${action.workflowTitle} | ${action.owner} | due ${action.due}`,
    meta: `${formatCurrency(action.valueAtStake)} at stake`
  }));
  const decisionItems = input.opportunities
    .map((opportunity) => ({
      title: opportunity.title,
      record: latestDecisionForWorkflow(input.decisions, opportunity.id)
    }))
    .filter((entry) => entry.record !== null)
    .map((entry) => ({
      primary: `${entry.title}: ${entry.record?.decision}`,
      secondary: `${entry.record?.date} | ${entry.record?.owner}`,
      meta: entry.record?.nextReviewWindow ?? "Review window pending"
    }));
  const agendaItems = input.agenda.map((item, index) => ({
    primary: item,
    secondary: "Weekly operating review",
    meta: `Agenda ${index + 1}`
  }));

  return {
    decision: buildDecision(input),
    posture: buildPosture(input),
    metrics: [
      {
        label: "Modeled value",
        value: formatCurrency(input.economics.annualizedValue),
        helper: `${formatCurrency(input.economics.netAnnualValue)} net annual value`
      },
      {
        label: "Enterprise readiness",
        value: input.enterpriseReadiness ? `${input.enterpriseReadiness.overallScore}/100` : "Pending",
        helper: input.enterpriseReadiness?.executiveSignal ?? "Readiness has not been calculated"
      },
      {
        label: "ROI / payback",
        value: `${input.economics.roiMultiple}x`,
        helper: `${input.economics.paybackMonths} month payback`
      },
      {
        label: "Critical/high actions",
        value: String(criticalOrHighActions.length),
        helper: `${formatCurrency(criticalOrHighActions.reduce((total, action) => total + action.valueAtStake, 0))} at stake`
      }
    ],
    sections: [
      {
        title: "Readiness Watchlist",
        emptyState: "Enterprise readiness has not been calculated yet.",
        items: readinessItems
      },
      {
        title: "Top Scale Candidates",
        emptyState: "No scale candidates yet. Intake and score workflows first.",
        items: scaleItems
      },
      {
        title: "Critical And High Blockers",
        emptyState: "No critical or high blockers are open.",
        items: blockerItems
      },
      {
        title: "Latest Decisions",
        emptyState: "No workflow decisions recorded yet.",
        items: decisionItems
      },
      {
        title: "Weekly Agenda",
        emptyState: "Agenda pending portfolio intake.",
        items: agendaItems
      }
    ],
    controlBoundary: CONTROL_BOUNDARY
  };
}
