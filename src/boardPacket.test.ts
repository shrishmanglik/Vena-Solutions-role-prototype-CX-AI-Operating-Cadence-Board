import { describe, expect, it } from "vitest";
import { buildBoardPacket, CONTROL_BOUNDARY } from "./boardPacket";
import { seedOpportunities } from "./data";
import { createDecisionRecord } from "./decisions";
import type { DecisionRecord } from "./decisions";
import { calculateEnterpriseReadiness } from "./enterpriseReadiness";
import {
  buildOperatingActions,
  buildWeeklyOperatingAgenda,
  calculatePortfolioEconomics,
  rankPortfolioContributors
} from "./portfolio";

function seededPacketInput() {
  const economics = calculatePortfolioEconomics(seedOpportunities);
  const contributors = rankPortfolioContributors(seedOpportunities);
  const actions = buildOperatingActions(seedOpportunities);
  const agenda = buildWeeklyOperatingAgenda(seedOpportunities, economics, actions);
  const enterpriseReadiness = calculateEnterpriseReadiness(seedOpportunities, economics, actions, []);

  return {
    scenarioName: "Base",
    opportunities: seedOpportunities,
    economics,
    contributors,
    openActions: actions,
    completedActions: [],
    agenda,
    decisions: [] as DecisionRecord[],
    enterpriseReadiness
  };
}

describe("board packet", () => {
  it("includes value, blockers, agenda, scenario, and the control boundary", () => {
    const packet = buildBoardPacket(seededPacketInput());

    expect(packet).toContain("WEEKLY BOARD PACKET");
    expect(packet).toContain("Scenario: Base");
    expect(packet).toContain("Modeled annual value");
    expect(packet).toContain("ROI:");
    expect(packet).toContain("ENTERPRISE READINESS");
    expect(packet).toContain("Value case");
    expect(packet).toContain("Operating discipline");
    expect(packet).toContain("CRITICAL BLOCKERS");
    expect(packet).toContain("WEEKLY OPERATING AGENDA");
    expect(packet).toContain(CONTROL_BOUNDARY);
  });

  it("lists the top three scale candidates", () => {
    const input = seededPacketInput();
    const packet = buildBoardPacket(input);

    for (const candidate of input.contributors.slice(0, 3)) {
      expect(packet).toContain(candidate.title);
    }
  });

  it("includes latest workflow decisions when recorded", () => {
    const input = seededPacketInput();
    const record = createDecisionRecord(
      {
        workflowId: seedOpportunities[0].id,
        decision: "Fund",
        owner: "CX VP",
        date: "2026-06-10",
        reason: "ROI and controls both clear the gate.",
        evidenceRequired: "Weekly pilot evidence pack.",
        nextReviewWindow: "2 weeks"
      },
      1
    ) as DecisionRecord;

    const packet = buildBoardPacket({ ...input, decisions: [record] });

    expect(packet).toContain(`${seedOpportunities[0].title}: Fund (2026-06-10, CX VP)`);
  });

  it("handles a fully empty portfolio without crashing", () => {
    const economics = calculatePortfolioEconomics([]);
    const packet = buildBoardPacket({
      scenarioName: "Conservative",
      opportunities: [],
      economics,
      contributors: [],
      openActions: [],
      completedActions: [],
      agenda: [],
      decisions: []
    });

    expect(packet).toContain("No workflows in the portfolio yet");
    expect(packet).toContain("None yet. Intake and score workflows");
    expect(packet).toContain("Enterprise readiness not calculated for this packet.");
    expect(packet).toContain("No critical blockers open this week.");
    expect(packet).toContain("Agenda pending portfolio intake.");
    expect(packet).toContain("No decisions recorded yet");
    expect(packet).toContain(CONTROL_BOUNDARY);
  });

  it("notes cleared actions when work was completed this week", () => {
    const input = seededPacketInput();
    const completed = input.openActions.slice(0, 2);
    const packet = buildBoardPacket({
      ...input,
      openActions: input.openActions.slice(2),
      completedActions: completed
    });

    expect(packet).toContain("Cleared this week: 2 action(s).");
  });
});
