import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import { calculateEnterpriseReadiness } from "./enterpriseReadiness";
import { buildBoardroomView } from "./boardroom";
import {
  buildOperatingActions,
  buildWeeklyOperatingAgenda,
  calculatePortfolioEconomics,
  rankPortfolioContributors
} from "./portfolio";

function seededInput() {
  const economics = calculatePortfolioEconomics(seedOpportunities);
  const openActions = buildOperatingActions(seedOpportunities);

  return {
    scenarioName: "Base",
    opportunities: seedOpportunities,
    economics,
    contributors: rankPortfolioContributors(seedOpportunities),
    openActions,
    completedActions: [],
    agenda: buildWeeklyOperatingAgenda(seedOpportunities, economics, openActions),
    decisions: [],
    enterpriseReadiness: calculateEnterpriseReadiness(seedOpportunities, economics, openActions, [])
  };
}

describe("boardroom view", () => {
  it("builds a leadership-facing decision posture with metrics", () => {
    const view = buildBoardroomView(seededInput());

    expect(view.decision).toContain("Fund");
    expect(view.posture).toContain("Base scenario");
    expect(view.metrics).toHaveLength(4);
    expect(view.metrics.map((metric) => metric.label)).toContain("Enterprise readiness");
  });

  it("surfaces blockers, scale candidates, readiness, and agenda sections", () => {
    const view = buildBoardroomView(seededInput());

    expect(view.sections.map((section) => section.title)).toEqual([
      "Readiness Watchlist",
      "Top Scale Candidates",
      "Critical And High Blockers",
      "Latest Decisions",
      "Weekly Agenda"
    ]);
    expect(view.sections.find((section) => section.title === "Top Scale Candidates")?.items.length).toBeGreaterThan(0);
    expect(view.sections.find((section) => section.title === "Critical And High Blockers")?.items.length).toBeGreaterThan(0);
  });

  it("handles an empty portfolio with explicit empty states", () => {
    const economics = calculatePortfolioEconomics([]);
    const view = buildBoardroomView({
      scenarioName: "Conservative",
      opportunities: [],
      economics,
      contributors: [],
      openActions: [],
      completedActions: [],
      agenda: [],
      decisions: []
    });

    expect(view.decision).toContain("Run intake");
    expect(view.sections.every((section) => section.emptyState.length > 0)).toBe(true);
  });
});
