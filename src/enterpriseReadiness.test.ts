import { describe, expect, it } from "vitest";
import { buildOperatingActions, calculatePortfolioEconomics } from "./portfolio";
import { calculateEnterpriseReadiness } from "./enterpriseReadiness";
import { seedOpportunities } from "./data";
import type { DecisionRecord } from "./decisions";

function decisionFor(workflowId: string, index: number): DecisionRecord {
  return {
    id: `decision-${index}-${workflowId}`,
    workflowId,
    decision: "Fund",
    owner: "CX Leadership",
    date: "2026-06-10",
    reason: "Pilot value and controls are clear.",
    evidenceRequired: "Usage, edit, QA, and owner review evidence.",
    nextReviewWindow: "2 weeks"
  };
}

describe("enterprise readiness", () => {
  it("creates bounded readiness dimensions for the portfolio", () => {
    const economics = calculatePortfolioEconomics(seedOpportunities);
    const actions = buildOperatingActions(seedOpportunities);
    const report = calculateEnterpriseReadiness(seedOpportunities, economics, actions, []);

    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.dimensions).toHaveLength(5);
    expect(report.dimensions.every((dimension) => dimension.nextMove.length > 0)).toBe(true);
  });

  it("credits explicit decisions in operating discipline", () => {
    const economics = calculatePortfolioEconomics(seedOpportunities);
    const actions = buildOperatingActions(seedOpportunities);
    const undecided = calculateEnterpriseReadiness(seedOpportunities, economics, actions, []);
    const decided = calculateEnterpriseReadiness(
      seedOpportunities,
      economics,
      actions,
      seedOpportunities.map((opportunity, index) => decisionFor(opportunity.id, index))
    );
    const undecidedOperating = undecided.dimensions.find((dimension) => dimension.label === "Operating discipline");
    const decidedOperating = decided.dimensions.find((dimension) => dimension.label === "Operating discipline");

    expect(decidedOperating?.score).toBeGreaterThan(undecidedOperating?.score ?? 0);
  });
});
