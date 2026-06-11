import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import { defaultPortfolioAssumptions } from "./portfolio";
import { buildBoardroomShareUrl, parseBoardroomShareHash } from "./boardroomShareLink";
import { buildPortfolioSnapshot } from "./portfolioSnapshot";

function snapshotJson() {
  return buildPortfolioSnapshot(
    {
      opportunities: seedOpportunities,
      selectedId: seedOpportunities[0].id,
      activeView: "Boardroom",
      assumptions: defaultPortfolioAssumptions,
      scenario: "Base",
      decisions: [],
      completedActionIds: [],
      snoozedActionIds: []
    },
    "2026-06-11T15:30:00.000Z",
    0
  );
}

describe("boardroom share links", () => {
  it("builds a share URL that parses back into a boardroom snapshot", () => {
    const url = buildBoardroomShareUrl(snapshotJson(), "https://vena-olive.vercel.app/?x=1");
    const parsed = parseBoardroomShareHash(new URL(url).hash);

    expect(url).toContain("#boardroom=");
    expect(parsed?.ok).toBe(true);
    if (parsed?.ok) {
      expect(parsed.state.activeView).toBe("Boardroom");
      expect(parsed.state.opportunities).toHaveLength(seedOpportunities.length);
    }
  });

  it("ignores unrelated hashes", () => {
    expect(parseBoardroomShareHash("#tab=Executive")).toBeNull();
    expect(parseBoardroomShareHash("")).toBeNull();
  });

  it("rejects unreadable boardroom tokens", () => {
    const parsed = parseBoardroomShareHash("#boardroom=%");

    expect(parsed?.ok).toBe(false);
  });
});
