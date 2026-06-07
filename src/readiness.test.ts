import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import {
  buildExecutiveBrief,
  calculateGovernanceReadiness,
  calculateQualityReadiness,
  countOpenApprovals,
  getNextGate
} from "./readiness";

describe("readiness", () => {
  it("keeps governance readiness inside score bounds", () => {
    for (const opportunity of seedOpportunities) {
      const readiness = calculateGovernanceReadiness(opportunity);

      expect(readiness).toBeGreaterThanOrEqual(0);
      expect(readiness).toBeLessThanOrEqual(100);
    }
  });

  it("credits passed QA checks more than pending checks", () => {
    const released = seedOpportunities.find((opportunity) => opportunity.stage === "Released");
    const intake = seedOpportunities.find((opportunity) => opportunity.stage === "Intake");

    expect(released).toBeDefined();
    expect(intake).toBeDefined();
    expect(calculateQualityReadiness(released!)).toBeGreaterThan(calculateQualityReadiness(intake!));
  });

  it("surfaces approval gates before release gates", () => {
    const buildItem = seedOpportunities[0];

    expect(countOpenApprovals(buildItem)).toBeGreaterThan(0);
    expect(getNextGate(buildItem)).toContain("Approval:");
  });

  it("builds a human-review bounded executive brief", () => {
    const brief = buildExecutiveBrief(seedOpportunities[0]);

    expect(brief).toContain("Governance readiness");
    expect(brief).toContain("human owner approves");
    expect(brief).not.toContain("autonomous");
  });
});
