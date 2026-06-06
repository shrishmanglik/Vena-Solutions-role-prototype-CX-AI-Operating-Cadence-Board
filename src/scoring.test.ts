import { describe, expect, it } from "vitest";
import { calculateOpportunityScores, classifyRiskTier, clampScore } from "./scoring";

describe("scoring", () => {
  it("clamps scores to the operating range", () => {
    expect(clampScore(-12)).toBe(0);
    expect(clampScore(50.4)).toBe(50);
    expect(clampScore(119)).toBe(100);
  });

  it("penalizes restricted data even when base risk is moderate", () => {
    expect(classifyRiskTier(50, "Restricted")).toBe("High");
    expect(classifyRiskTier(50, "Low")).toBe("Medium");
  });

  it("prioritizes high value and feasible workflows above risky low value work", () => {
    const strong = calculateOpportunityScores({
      value: 90,
      feasibility: 86,
      risk: 24,
      strategicAlignment: 88,
      urgency: 76,
      sensitivity: "Low"
    });
    const weak = calculateOpportunityScores({
      value: 48,
      feasibility: 42,
      risk: 84,
      strategicAlignment: 40,
      urgency: 35,
      sensitivity: "Sensitive"
    });

    expect(strong.priority).toBeGreaterThan(weak.priority);
    expect(weak.tier).toBe("High");
  });
});
