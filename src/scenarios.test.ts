import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import { buildPortfolioBusinessCase, calculatePortfolioEconomics, rankPortfolioContributors } from "./portfolio";
import { getScenarioPreset, isScenarioSelection, matchScenario, scenarioPresets } from "./scenarios";

describe("scenario planner", () => {
  it("ships conservative, base, and aggressive presets", () => {
    expect(scenarioPresets.map((preset) => preset.id)).toEqual(["Conservative", "Base", "Aggressive"]);
  });

  it("orders modeled value conservative < base < aggressive", () => {
    const conservative = calculatePortfolioEconomics(seedOpportunities, getScenarioPreset("Conservative").assumptions);
    const base = calculatePortfolioEconomics(seedOpportunities, getScenarioPreset("Base").assumptions);
    const aggressive = calculatePortfolioEconomics(seedOpportunities, getScenarioPreset("Aggressive").assumptions);

    expect(conservative.annualizedValue).toBeLessThan(base.annualizedValue);
    expect(base.annualizedValue).toBeLessThan(aggressive.annualizedValue);
  });

  it("matches assumptions back to a preset and flags edits as Custom", () => {
    const base = getScenarioPreset("Base").assumptions;

    expect(matchScenario(base)).toBe("Base");
    expect(matchScenario({ ...base, adoptionCoverage: base.adoptionCoverage + 1 })).toBe("Custom");
  });

  it("includes the scenario name in the business case memo", () => {
    const assumptions = getScenarioPreset("Aggressive").assumptions;
    const economics = calculatePortfolioEconomics(seedOpportunities, assumptions);
    const contributors = rankPortfolioContributors(seedOpportunities, assumptions);
    const memo = buildPortfolioBusinessCase(seedOpportunities, economics, contributors, "Aggressive");

    expect(memo).toContain("Scenario: Aggressive");
  });

  it("validates scenario selections defensively", () => {
    expect(isScenarioSelection("Base")).toBe(true);
    expect(isScenarioSelection("Custom")).toBe(true);
    expect(isScenarioSelection("YOLO")).toBe(false);
    expect(isScenarioSelection(42)).toBe(false);
  });
});
