import type { DecisionRecord } from "./decisions";
import { latestDecisionForWorkflow } from "./decisions";
import type { OperatingAction, PortfolioContributor, PortfolioEconomics } from "./portfolio";
import { formatCurrency } from "./portfolio";
import type { AiOpportunity } from "./types";

export interface BoardPacketInput {
  scenarioName: string;
  opportunities: AiOpportunity[];
  economics: PortfolioEconomics;
  contributors: PortfolioContributor[];
  openActions: OperatingAction[];
  completedActions: OperatingAction[];
  agenda: string[];
  decisions: DecisionRecord[];
}

export const CONTROL_BOUNDARY =
  "Non-negotiable control boundary: customer-facing AI output stays draft-first, source-linked, and human-approved before any write or send action.";

export function buildBoardPacket(input: BoardPacketInput): string {
  const lines: string[] = [];

  lines.push("VENA CX AI PORTFOLIO — WEEKLY BOARD PACKET");
  lines.push(`Scenario: ${input.scenarioName}`);
  lines.push("");

  lines.push("PORTFOLIO VALUE SUMMARY");

  if (input.opportunities.length === 0) {
    lines.push("- No workflows in the portfolio yet. Run intake before the next review.");
  } else {
    lines.push(
      `- Modeled annual value: ${formatCurrency(input.economics.annualizedValue)} across ${input.opportunities.length} governed workflows.`
    );
    lines.push(
      `- Net annual value: ${formatCurrency(input.economics.netAnnualValue)} after ${formatCurrency(input.economics.pilotInvestment)} pilot investment.`
    );
    lines.push(
      `- Capacity recovered: ${input.economics.annualHoursRecovered.toLocaleString("en-US")} hours/year. Release-ready workflows: ${input.economics.governanceReadyCount}.`
    );
    lines.push(
      `- ROI: ${input.economics.roiMultiple}x | Payback: ${input.economics.paybackMonths} months | Confidence: ${input.economics.confidenceScore}/100.`
    );
  }

  lines.push("");
  lines.push("TOP SCALE CANDIDATES");

  const topCandidates = input.contributors.slice(0, 3);

  if (topCandidates.length === 0) {
    lines.push("- None yet. Intake and score workflows to build the scale shortlist.");
  } else {
    for (const candidate of topCandidates) {
      lines.push(`- ${candidate.title}: ${formatCurrency(candidate.contribution)} modeled value. Next gate: ${candidate.nextGate}.`);
    }
  }

  lines.push("");
  lines.push("CRITICAL BLOCKERS");

  const criticalActions = input.openActions.filter((action) => action.severity === "Critical");

  if (criticalActions.length === 0) {
    lines.push("- No critical blockers open this week.");
  } else {
    for (const action of criticalActions) {
      lines.push(
        `- ${action.action} (${action.workflowTitle}). Owner: ${action.owner}. Due: ${action.due}. Value at stake: ${formatCurrency(action.valueAtStake)}.`
      );
    }
  }

  if (input.completedActions.length > 0) {
    lines.push(`- Cleared this week: ${input.completedActions.length} action(s).`);
  }

  lines.push("");
  lines.push("WEEKLY OPERATING AGENDA");

  if (input.agenda.length === 0) {
    lines.push("- Agenda pending portfolio intake.");
  } else {
    for (const item of input.agenda) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("");
  lines.push("LATEST WORKFLOW DECISIONS");

  const decided = input.opportunities
    .map((opportunity) => ({
      title: opportunity.title,
      record: latestDecisionForWorkflow(input.decisions, opportunity.id)
    }))
    .filter((entry): entry is { title: string; record: DecisionRecord } => entry.record !== null);

  if (decided.length === 0) {
    lines.push("- No decisions recorded yet. Record Fund / Hold / Scale / Pause / Retire calls in the Workflow tab.");
  } else {
    for (const entry of decided) {
      lines.push(
        `- ${entry.title}: ${entry.record.decision} (${entry.record.date}, ${entry.record.owner}). ${entry.record.reason} Next review: ${entry.record.nextReviewWindow}.`
      );
    }
  }

  lines.push("");
  lines.push(CONTROL_BOUNDARY);

  return lines.join("\n");
}
