import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import { createDecisionRecord } from "./decisions";
import type { DecisionRecord } from "./decisions";
import { defaultPortfolioAssumptions } from "./portfolio";
import { buildPortfolioSnapshot, parsePortfolioSnapshot, SNAPSHOT_SCHEMA, SNAPSHOT_VERSION } from "./portfolioSnapshot";
import type { SaveStateInput } from "./persistence";

function sampleState(): SaveStateInput {
  const decision = createDecisionRecord(
    {
      workflowId: seedOpportunities[0].id,
      decision: "Scale",
      owner: "CX VP",
      date: "2026-06-11",
      reason: "Evidence and adoption cleared the review gate.",
      evidenceRequired: "Weekly evidence pack.",
      nextReviewWindow: "30 days"
    },
    1
  ) as DecisionRecord;

  return {
    opportunities: seedOpportunities,
    selectedId: seedOpportunities[2].id,
    activeView: "Boardroom",
    assumptions: { ...defaultPortfolioAssumptions, adoptionCoverage: 88 },
    scenario: "Custom",
    decisions: [decision],
    completedActionIds: ["cx-003-measure"],
    snoozedActionIds: ["cx-001-approval"]
  };
}

describe("portfolio snapshots", () => {
  it("round-trips a sanitized portfolio operating state", () => {
    const snapshot = buildPortfolioSnapshot(sampleState(), "2026-06-11T14:00:00.000Z");
    const parsed = parsePortfolioSnapshot(snapshot);

    expect(snapshot).toContain(SNAPSHOT_SCHEMA);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.state.opportunities).toHaveLength(seedOpportunities.length);
    expect(parsed.state.selectedId).toBe(seedOpportunities[2].id);
    expect(parsed.state.activeView).toBe("Boardroom");
    expect(parsed.state.assumptions.adoptionCoverage).toBe(88);
    expect(parsed.state.decisions).toHaveLength(1);
    expect(parsed.state.completedActionIds).toEqual(["cx-003-measure"]);
  });

  it("rejects malformed or unsupported snapshots", () => {
    expect(parsePortfolioSnapshot("{nope").ok).toBe(false);
    expect(parsePortfolioSnapshot(JSON.stringify({ schema: "other", version: SNAPSHOT_VERSION, state: {} })).ok).toBe(false);
  });

  it("falls back to the first workflow when selected id is stale", () => {
    const snapshot = JSON.stringify({
      schema: SNAPSHOT_SCHEMA,
      version: SNAPSHOT_VERSION,
      exportedAt: "2026-06-11T14:00:00.000Z",
      state: { ...sampleState(), selectedId: "missing-workflow" }
    });
    const parsed = parsePortfolioSnapshot(snapshot);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.state.selectedId).toBe(seedOpportunities[0].id);
    }
  });
});
