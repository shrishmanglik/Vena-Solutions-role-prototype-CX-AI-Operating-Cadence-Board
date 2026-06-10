import { calculateGovernanceReadiness, countOpenApprovals, getNextGate } from "./readiness";
import type { AiOpportunity } from "./types";

export interface PortfolioAssumptions {
  loadedHourlyCost: number;
  scaleMultiplier: number;
  adoptionCoverage: number;
  pilotInvestment: number;
  cxDelayCostPerDay: number;
}

export interface PortfolioEconomics {
  weeklyHoursBase: number;
  annualHoursRecovered: number;
  timeToValueDaysRecovered: number;
  capacityValue: number;
  accelerationValue: number;
  controlValue: number;
  annualizedValue: number;
  pilotInvestment: number;
  netAnnualValue: number;
  roiMultiple: number;
  paybackMonths: number;
  governanceReadyCount: number;
  averageGovernanceReadiness: number;
  confidenceScore: number;
}

export interface PortfolioContributor {
  id: string;
  title: string;
  owner: string;
  contribution: number;
  nextGate: string;
}

export type OperatingActionSeverity = "Critical" | "High" | "Medium" | "Watch";

export interface OperatingAction {
  id: string;
  workflowTitle: string;
  owner: string;
  cxArea: string;
  severity: OperatingActionSeverity;
  due: string;
  action: string;
  reason: string;
  valueAtStake: number;
}

export const defaultPortfolioAssumptions: PortfolioAssumptions = {
  loadedHourlyCost: 125,
  scaleMultiplier: 4,
  adoptionCoverage: 82,
  pilotInvestment: 185000,
  cxDelayCostPerDay: 425
};

export const investmentGates = [
  {
    label: "Fund",
    condition: "Modeled annual value clears the pilot investment by at least 3x.",
    decision: "Approve a 90-day pilot with named CX and IT/Security owners."
  },
  {
    label: "Control",
    condition: "Sensitive workflows remain draft-first with open approval gates visible.",
    decision: "Keep customer-facing write/send actions behind human owner review."
  },
  {
    label: "Scale",
    condition: "Adoption, edit reasons, source quality, and cycle-time movement improve weekly.",
    decision: "Expand only the workflows that prove repeatable value and control maturity."
  }
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function severityWeight(severity: OperatingActionSeverity): number {
  if (severity === "Critical") {
    return 4;
  }

  if (severity === "High") {
    return 3;
  }

  if (severity === "Medium") {
    return 2;
  }

  return 1;
}

export function calculatePortfolioEconomics(
  opportunities: AiOpportunity[],
  assumptions: PortfolioAssumptions = defaultPortfolioAssumptions
): PortfolioEconomics {
  const adoptionFactor = clamp(assumptions.adoptionCoverage, 0, 100) / 100;
  const scaleFactor = Math.max(1, assumptions.scaleMultiplier);
  const weeklyHoursBase = sum(opportunities.map((opportunity) => opportunity.impact.hoursSavedPerWeek));
  const annualHoursRecovered = Math.round(weeklyHoursBase * 52 * scaleFactor * adoptionFactor);
  const capacityValue = Math.round(annualHoursRecovered * assumptions.loadedHourlyCost);
  const baseTimeToValueDays = sum(
    opportunities.map((opportunity) => opportunity.impact.timeToValueDays * opportunity.workflowVolume)
  );
  const timeToValueDaysRecovered = Math.round(baseTimeToValueDays * 0.35 * scaleFactor * adoptionFactor);
  const accelerationValue = Math.round(timeToValueDaysRecovered * assumptions.cxDelayCostPerDay);
  const governanceReadyCount = opportunities.filter(
    (opportunity) => calculateGovernanceReadiness(opportunity) >= 70 && countOpenApprovals(opportunity) === 0
  ).length;
  const averageGovernanceReadiness =
    opportunities.length === 0
      ? 0
      : Math.round(sum(opportunities.map((opportunity) => calculateGovernanceReadiness(opportunity))) / opportunities.length);
  const controlValue = Math.round(
    (governanceReadyCount * 45000 + Math.max(0, averageGovernanceReadiness - 55) * 5000) * scaleFactor
  );
  const annualizedValue = capacityValue + accelerationValue + controlValue;
  const pilotInvestment = assumptions.pilotInvestment + opportunities.length * 8000;
  const netAnnualValue = annualizedValue - pilotInvestment;
  const roiMultiple = pilotInvestment === 0 ? 0 : Number((annualizedValue / pilotInvestment).toFixed(1));
  const paybackMonths = annualizedValue === 0 ? 0 : Math.max(1, Math.ceil(pilotInvestment / (annualizedValue / 12)));
  const confidenceScore = Math.round(
    clamp(averageGovernanceReadiness * 0.55 + assumptions.adoptionCoverage * 0.3 + Math.min(100, roiMultiple * 10) * 0.15, 0, 100)
  );

  return {
    weeklyHoursBase,
    annualHoursRecovered,
    timeToValueDaysRecovered,
    capacityValue,
    accelerationValue,
    controlValue,
    annualizedValue,
    pilotInvestment,
    netAnnualValue,
    roiMultiple,
    paybackMonths,
    governanceReadyCount,
    averageGovernanceReadiness,
    confidenceScore
  };
}

export function rankPortfolioContributors(
  opportunities: AiOpportunity[],
  assumptions: PortfolioAssumptions = defaultPortfolioAssumptions
): PortfolioContributor[] {
  const adoptionFactor = clamp(assumptions.adoptionCoverage, 0, 100) / 100;
  const scaleFactor = Math.max(1, assumptions.scaleMultiplier);

  return opportunities
    .map((opportunity) => {
      const capacity = opportunity.impact.hoursSavedPerWeek * 52 * assumptions.loadedHourlyCost * scaleFactor * adoptionFactor;
      const acceleration =
        opportunity.impact.timeToValueDays * opportunity.workflowVolume * 0.35 * assumptions.cxDelayCostPerDay * scaleFactor * adoptionFactor;
      const readiness = calculateGovernanceReadiness(opportunity);
      const readinessLift = readiness >= 70 && countOpenApprovals(opportunity) === 0 ? 35000 * scaleFactor : 0;

      return {
        id: opportunity.id,
        title: opportunity.title,
        owner: opportunity.owner,
        contribution: Math.round(capacity + acceleration + readinessLift),
        nextGate: getNextGate(opportunity)
      };
    })
    .sort((a, b) => b.contribution - a.contribution);
}

export function buildOperatingActions(
  opportunities: AiOpportunity[],
  assumptions: PortfolioAssumptions = defaultPortfolioAssumptions
): OperatingAction[] {
  const contributionById = new Map(
    rankPortfolioContributors(opportunities, assumptions).map((contributor) => [contributor.id, contributor.contribution])
  );

  return opportunities
    .map((opportunity): OperatingAction => {
      const openApproval = opportunity.approvals.find((approval) => approval.status === "Required");
      const blockedCheck = opportunity.qaChecklist.find((check) => check.status === "Blocked");
      const activeCheck = opportunity.qaChecklist.find((check) => check.status === "In review");
      const pendingCheck = opportunity.qaChecklist.find((check) => check.status === "Not started");
      const readiness = calculateGovernanceReadiness(opportunity);
      const valueAtStake = contributionById.get(opportunity.id) ?? 0;

      if (openApproval) {
        const isSensitive = opportunity.sensitivity === "Sensitive" || opportunity.sensitivity === "Restricted";

        return {
          id: `${opportunity.id}-approval`,
          workflowTitle: opportunity.title,
          owner: openApproval.owner,
          cxArea: opportunity.cxArea,
          severity: isSensitive ? "Critical" : "High",
          due: isSensitive ? "48 hrs" : "3 days",
          action: `Clear approval: ${openApproval.label}`,
          reason: "Unblocks governed pilot progress without weakening the human-review boundary.",
          valueAtStake
        };
      }

      if (blockedCheck) {
        return {
          id: `${opportunity.id}-qa-blocked`,
          workflowTitle: opportunity.title,
          owner: opportunity.owner,
          cxArea: opportunity.cxArea,
          severity: "Critical",
          due: "48 hrs",
          action: `Unblock QA: ${blockedCheck.label}`,
          reason: "A blocked evaluation prevents release evidence from being trusted.",
          valueAtStake
        };
      }

      if (activeCheck) {
        return {
          id: `${opportunity.id}-qa-review`,
          workflowTitle: opportunity.title,
          owner: opportunity.owner,
          cxArea: opportunity.cxArea,
          severity: "High",
          due: "3 days",
          action: `Finish QA review: ${activeCheck.label}`,
          reason: "Moves the workflow from promising to releasable with evidence.",
          valueAtStake
        };
      }

      if (pendingCheck) {
        return {
          id: `${opportunity.id}-qa-start`,
          workflowTitle: opportunity.title,
          owner: opportunity.owner,
          cxArea: opportunity.cxArea,
          severity: readiness < 70 ? "High" : "Medium",
          due: "5 days",
          action: `Start QA evidence: ${pendingCheck.label}`,
          reason: "Creates the proof CX, IT/Security, and workflow owners need to scale safely.",
          valueAtStake
        };
      }

      if (opportunity.stage !== "Released") {
        return {
          id: `${opportunity.id}-release`,
          workflowTitle: opportunity.title,
          owner: opportunity.owner,
          cxArea: opportunity.cxArea,
          severity: "High",
          due: "5 days",
          action: "Schedule controlled pilot release",
          reason: "The workflow has cleared core gates and needs measured pilot usage.",
          valueAtStake
        };
      }

      return {
        id: `${opportunity.id}-measure`,
        workflowTitle: opportunity.title,
        owner: opportunity.owner,
        cxArea: opportunity.cxArea,
        severity: "Watch",
        due: "7 days",
        action: "Review adoption, edits, and cycle-time evidence",
        reason: "Released workflows should earn scale through measured use, not launch status.",
        valueAtStake
      };
    })
    .sort((a, b) => {
      const severityDelta = severityWeight(b.severity) - severityWeight(a.severity);

      if (severityDelta !== 0) {
        return severityDelta;
      }

      return b.valueAtStake - a.valueAtStake;
    });
}

export function buildWeeklyOperatingAgenda(
  opportunities: AiOpportunity[],
  economics: PortfolioEconomics,
  actions: OperatingAction[]
): string[] {
  const criticalActions = actions.filter((action) => action.severity === "Critical").length;
  const openApprovals = sum(opportunities.map((opportunity) => countOpenApprovals(opportunity)));
  const readyWorkflows = opportunities.filter(
    (opportunity) => calculateGovernanceReadiness(opportunity) >= 70 && countOpenApprovals(opportunity) === 0
  ).length;

  return [
    `Decide funding posture: ${formatCurrency(economics.annualizedValue)} modeled annual value, ${economics.roiMultiple}x ROI.`,
    `Clear blockers: ${criticalActions} critical actions and ${openApprovals} open approval gates.`,
    `Promote or hold: ${readyWorkflows} workflows are release-ready under current governance rules.`,
    "Inspect source quality, QA evidence, and human-review exceptions before any scale decision.",
    "Assign one owner and due date for each action before the meeting ends."
  ];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function buildPortfolioBusinessCase(
  opportunities: AiOpportunity[],
  economics: PortfolioEconomics,
  contributors: PortfolioContributor[],
  scenarioName = "Base"
): string {
  const topContributor = contributors[0];
  const decision =
    economics.annualizedValue >= 1000000 && economics.confidenceScore >= 70
      ? "Fund the 90-day CX AI pilot and prepare the top workflows for controlled scale."
      : "Keep the pilot in controlled discovery until readiness and modeled value clear the fund gate.";

  return [
    "Vena CX AI operating-system business case",
    `Scenario: ${scenarioName}`,
    `Decision: ${decision}`,
    `Modeled annual value: ${formatCurrency(economics.annualizedValue)} against ${formatCurrency(economics.pilotInvestment)} pilot investment.`,
    `ROI multiple: ${economics.roiMultiple}x | Payback: ${economics.paybackMonths} months | Confidence: ${economics.confidenceScore}/100.`,
    `Capacity unlocked: ${economics.annualHoursRecovered.toLocaleString("en-US")} hours/year across ${opportunities.length} governed workflow patterns.`,
    `Acceleration value: ${economics.timeToValueDaysRecovered.toLocaleString("en-US")} customer time-to-value days recovered.`,
    `Control value: ${formatCurrency(economics.controlValue)} from release-ready workflows and governance maturity.`,
    topContributor
      ? `Top scale candidate: ${topContributor.title} (${formatCurrency(topContributor.contribution)} modeled value). Gate: ${topContributor.nextGate}.`
      : "Top scale candidate: pending workflow intake.",
    "Non-negotiable control: draft-first, source-linked, human-approved customer-facing actions."
  ].join("\n");
}
