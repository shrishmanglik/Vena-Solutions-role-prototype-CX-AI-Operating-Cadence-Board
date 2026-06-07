import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import {
  buildPortfolioBusinessCase,
  buildOperatingActions,
  buildWeeklyOperatingAgenda,
  calculatePortfolioEconomics,
  defaultPortfolioAssumptions,
  rankPortfolioContributors
} from "./portfolio";

describe("portfolio economics", () => {
  it("models a seven-figure annual value case at the default scale assumptions", () => {
    const economics = calculatePortfolioEconomics(seedOpportunities);

    expect(economics.annualizedValue).toBeGreaterThan(1000000);
    expect(economics.roiMultiple).toBeGreaterThan(3);
    expect(economics.paybackMonths).toBeLessThanOrEqual(4);
  });

  it("increases modeled value when the rollout scale increases", () => {
    const base = calculatePortfolioEconomics(seedOpportunities, {
      ...defaultPortfolioAssumptions,
      scaleMultiplier: 2
    });
    const scaled = calculatePortfolioEconomics(seedOpportunities, {
      ...defaultPortfolioAssumptions,
      scaleMultiplier: 5
    });

    expect(scaled.annualizedValue).toBeGreaterThan(base.annualizedValue);
    expect(scaled.annualHoursRecovered).toBeGreaterThan(base.annualHoursRecovered);
  });

  it("builds a copy-ready executive business case", () => {
    const economics = calculatePortfolioEconomics(seedOpportunities);
    const contributors = rankPortfolioContributors(seedOpportunities);
    const memo = buildPortfolioBusinessCase(seedOpportunities, economics, contributors);

    expect(memo).toContain("Modeled annual value");
    expect(memo).toContain("90-day CX AI pilot");
    expect(memo).toContain("draft-first");
  });

  it("prioritizes operating actions by control urgency and value at stake", () => {
    const actions = buildOperatingActions(seedOpportunities);

    expect(actions.length).toBe(seedOpportunities.length);
    expect(actions[0].severity).toBe("Critical");
    expect(actions[0].action).toContain("Clear approval");
    expect(actions.every((action) => action.owner.length > 0)).toBe(true);
  });

  it("builds a weekly operating agenda from economics and blocker state", () => {
    const economics = calculatePortfolioEconomics(seedOpportunities);
    const actions = buildOperatingActions(seedOpportunities);
    const agenda = buildWeeklyOperatingAgenda(seedOpportunities, economics, actions);

    expect(agenda).toHaveLength(5);
    expect(agenda[0]).toContain("modeled annual value");
    expect(agenda[1]).toContain("open approval");
  });
});
