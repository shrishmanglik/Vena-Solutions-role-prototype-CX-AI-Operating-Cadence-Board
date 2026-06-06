import type { IntakeDraft, OpportunityScores, RiskTier, SensitivityLevel } from "./types";

const sensitivityPenalty: Record<SensitivityLevel, number> = {
  Low: 0,
  Moderate: 6,
  Sensitive: 14,
  Restricted: 24
};

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function classifyRiskTier(risk: number, sensitivity: SensitivityLevel): RiskTier {
  const adjustedRisk = risk + sensitivityPenalty[sensitivity];

  if (adjustedRisk >= 72) {
    return "High";
  }

  if (adjustedRisk >= 42) {
    return "Medium";
  }

  return "Low";
}

export function calculateOpportunityScores(draft: Pick<
  IntakeDraft,
  "value" | "feasibility" | "risk" | "strategicAlignment" | "urgency" | "sensitivity"
>): OpportunityScores {
  const weightedValue = draft.value * 0.32;
  const weightedFeasibility = draft.feasibility * 0.22;
  const weightedStrategic = draft.strategicAlignment * 0.2;
  const weightedUrgency = draft.urgency * 0.16;
  const riskDrag = draft.risk * 0.16 + sensitivityPenalty[draft.sensitivity] * 0.8;

  return {
    value: clampScore(draft.value),
    feasibility: clampScore(draft.feasibility),
    risk: clampScore(draft.risk),
    strategicAlignment: clampScore(draft.strategicAlignment),
    urgency: clampScore(draft.urgency),
    priority: clampScore(weightedValue + weightedFeasibility + weightedStrategic + weightedUrgency - riskDrag + 18),
    tier: classifyRiskTier(draft.risk, draft.sensitivity)
  };
}

export function riskSortWeight(tier: RiskTier): number {
  if (tier === "High") {
    return 3;
  }

  if (tier === "Medium") {
    return 2;
  }

  return 1;
}
