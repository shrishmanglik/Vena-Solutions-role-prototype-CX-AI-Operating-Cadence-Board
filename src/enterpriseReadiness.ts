import type { DecisionRecord } from "./decisions";
import type { OperatingAction, PortfolioEconomics } from "./portfolio";
import { calculateGovernanceReadiness, countOpenApprovals } from "./readiness";
import type { AiOpportunity, KnowledgeSource, QualityCheck } from "./types";

export type EnterpriseReadinessStatus = "Ready" | "Watch" | "Blocked";

export interface EnterpriseReadinessDimension {
  label: string;
  score: number;
  status: EnterpriseReadinessStatus;
  signal: string;
  nextMove: string;
}

export interface EnterpriseReadinessReport {
  overallScore: number;
  status: EnterpriseReadinessStatus;
  dimensions: EnterpriseReadinessDimension[];
  executiveSignal: string;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusFor(score: number): EnterpriseReadinessStatus {
  if (score >= 78) {
    return "Ready";
  }

  if (score >= 60) {
    return "Watch";
  }

  return "Blocked";
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sourceTrustScore(sources: KnowledgeSource[]): number {
  if (sources.length === 0) {
    return 0;
  }

  const weights: Record<KnowledgeSource["trust"], number> = {
    High: 100,
    Medium: 70,
    "Needs review": 30
  };

  return average(sources.map((source) => weights[source.trust]));
}

function qaEvidenceScore(checks: QualityCheck[]): number {
  if (checks.length === 0) {
    return 0;
  }

  const weights: Record<QualityCheck["status"], number> = {
    Passed: 100,
    "In review": 60,
    "Not started": 15,
    Blocked: 0
  };

  return average(checks.map((check) => weights[check.status]));
}

export function calculateEnterpriseReadiness(
  opportunities: AiOpportunity[],
  economics: PortfolioEconomics,
  actions: OperatingAction[],
  decisions: DecisionRecord[]
): EnterpriseReadinessReport {
  const governanceScores = opportunities.map((opportunity) => calculateGovernanceReadiness(opportunity));
  const openApprovals = opportunities.reduce((total, opportunity) => total + countOpenApprovals(opportunity), 0);
  const openCriticalActions = actions.filter((action) => action.severity === "Critical" || action.severity === "High").length;
  const decisionCoverage = opportunities.length === 0 ? 0 : new Set(decisions.map((decision) => decision.workflowId)).size / opportunities.length;
  const sourceScores = opportunities.map((opportunity) => sourceTrustScore(opportunity.knowledgeSources));
  const qaScores = opportunities.map((opportunity) => qaEvidenceScore(opportunity.qaChecklist));
  const adoptionScores = opportunities.map((opportunity) => opportunity.impact.adoptionReadiness);

  const valueScore = clampScore((economics.annualizedValue / 1000000) * 88 + Math.min(12, economics.roiMultiple * 2));
  const governanceScore = clampScore(average(governanceScores) - openApprovals * 4);
  const evidenceScore = clampScore(average(sourceScores) * 0.45 + average(qaScores) * 0.55);
  const adoptionScore = clampScore(average(adoptionScores) * 0.75 + Math.min(25, economics.confidenceScore * 0.25));
  const operatingScore = clampScore(decisionCoverage * 65 + Math.max(0, 35 - openCriticalActions * 7));

  const dimensions: EnterpriseReadinessDimension[] = [
    {
      label: "Value case",
      score: valueScore,
      status: statusFor(valueScore),
      signal: `${economics.roiMultiple}x ROI with ${economics.paybackMonths} month payback.`,
      nextMove: "Keep scenario assumptions visible in every funding discussion."
    },
    {
      label: "Governance",
      score: governanceScore,
      status: statusFor(governanceScore),
      signal: `${openApprovals} open approval gates across ${opportunities.length} workflows.`,
      nextMove: "Clear sensitive approvals before expanding any customer-facing workflow."
    },
    {
      label: "Evidence",
      score: evidenceScore,
      status: statusFor(evidenceScore),
      signal: "Source trust and QA evidence determine release confidence.",
      nextMove: "Raise source trust and finish QA evidence for workflows under review."
    },
    {
      label: "Adoption",
      score: adoptionScore,
      status: statusFor(adoptionScore),
      signal: `${Math.round(average(adoptionScores))}/100 average adoption readiness.`,
      nextMove: "Tie every pilot to owner enablement, edit reasons, and usage review."
    },
    {
      label: "Operating discipline",
      score: operatingScore,
      status: statusFor(operatingScore),
      signal: `${Math.round(decisionCoverage * 100)}% decision coverage and ${openCriticalActions} critical/high actions.`,
      nextMove: "Record fund/hold/scale decisions and close high-severity actions weekly."
    }
  ];

  const overallScore = clampScore(
    valueScore * 0.22 + governanceScore * 0.24 + evidenceScore * 0.22 + adoptionScore * 0.16 + operatingScore * 0.16
  );
  const status = statusFor(overallScore);
  const executiveSignal =
    status === "Ready"
      ? "Portfolio is ready for a controlled executive-sponsored pilot."
      : status === "Watch"
        ? "Portfolio is promising, but leadership should clear readiness gaps before broad scale."
        : "Portfolio needs governance, evidence, or operating discipline before pilot funding.";

  return {
    overallScore,
    status,
    dimensions,
    executiveSignal
  };
}
