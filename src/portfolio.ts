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
  contributors: PortfolioContributor[]
): string {
  const topContributor = contributors[0];
  const decision =
    economics.annualizedValue >= 1000000 && economics.confidenceScore >= 70
      ? "Fund the 90-day CX AI pilot and prepare the top workflows for controlled scale."
      : "Keep the pilot in controlled discovery until readiness and modeled value clear the fund gate.";

  return [
    "Vena CX AI operating-system business case",
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
