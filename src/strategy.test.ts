import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import { architectureLanes, pilotRoadmap, platformFitByArea } from "./strategy";

describe("strategy layer", () => {
  it("defines platform-fit guidance for every seeded CX area", () => {
    for (const opportunity of seedOpportunities) {
      expect(platformFitByArea[opportunity.cxArea].length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the pilot operating model complete enough for an executive review", () => {
    expect(architectureLanes).toHaveLength(4);
    expect(pilotRoadmap).toHaveLength(3);
    expect(pilotRoadmap.map((milestone) => milestone.window)).toEqual(["Days 0-30", "Days 31-60", "Days 61-90"]);
  });
});
