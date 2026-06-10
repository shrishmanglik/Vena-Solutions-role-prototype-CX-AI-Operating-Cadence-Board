import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import {
  createDecisionRecord,
  latestDecisionForWorkflow,
  sanitizeDecisionRecords,
  summarizeDecisionPosture
} from "./decisions";
import type { DecisionDraft, DecisionRecord } from "./decisions";

const validDraft: DecisionDraft = {
  workflowId: "cx-001",
  decision: "Fund",
  owner: "CX VP",
  date: "2026-06-10",
  reason: "ROI clears the fund gate with controls in place.",
  evidenceRequired: "25 governed uses with tagged edit reasons.",
  nextReviewWindow: "2 weeks"
};

describe("decision records", () => {
  it("creates a decision record from a valid draft", () => {
    const record = createDecisionRecord(validDraft, 1);

    expect(record).not.toBeNull();
    expect(record?.decision).toBe("Fund");
    expect(record?.id).toContain("cx-001");
  });

  it("rejects drafts with empty owner or reason", () => {
    expect(createDecisionRecord({ ...validDraft, owner: "  " }, 1)).toBeNull();
    expect(createDecisionRecord({ ...validDraft, reason: "" }, 1)).toBeNull();
  });

  it("rejects invalid decision types and review windows", () => {
    expect(createDecisionRecord({ ...validDraft, decision: "Ship it" as never }, 1)).toBeNull();
    expect(createDecisionRecord({ ...validDraft, nextReviewWindow: "someday" as never }, 1)).toBeNull();
  });

  it("falls back to a default evidence requirement", () => {
    const record = createDecisionRecord({ ...validDraft, evidenceRequired: "  " }, 1);

    expect(record?.evidenceRequired).toContain("evidence");
  });

  it("surfaces the latest decision first", () => {
    const older = createDecisionRecord({ ...validDraft, decision: "Hold", date: "2026-06-01" }, 1) as DecisionRecord;
    const newer = createDecisionRecord({ ...validDraft, decision: "Fund", date: "2026-06-09" }, 2) as DecisionRecord;
    const records = [newer, older];

    expect(latestDecisionForWorkflow(records, "cx-001")?.decision).toBe("Fund");
    expect(latestDecisionForWorkflow(records, "cx-404")).toBeNull();
  });

  it("summarizes portfolio decision posture", () => {
    const fund = createDecisionRecord(validDraft, 1) as DecisionRecord;
    const pause = createDecisionRecord(
      { ...validDraft, workflowId: "cx-002", decision: "Pause", reason: "Source trust is too low." },
      2
    ) as DecisionRecord;

    const summary = summarizeDecisionPosture(seedOpportunities, [fund, pause]);

    expect(summary.decidedWorkflows).toBe(2);
    expect(summary.undecidedWorkflows).toBe(seedOpportunities.length - 2);
    expect(summary.counts.Fund).toBe(1);
    expect(summary.counts.Pause).toBe(1);
    expect(summary.latestDecisions.map((entry) => entry.record.workflowId)).toContain("cx-002");
  });

  it("ignores malformed persisted decision data", () => {
    const valid = createDecisionRecord(validDraft, 1) as DecisionRecord;
    const sanitized = sanitizeDecisionRecords([
      valid,
      null,
      "garbage",
      { decision: "Fund" },
      { ...valid, decision: "Sell the company" },
      { ...valid, owner: "" }
    ]);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].id).toBe(valid.id);
  });

  it("returns an empty list for non-array input", () => {
    expect(sanitizeDecisionRecords(undefined)).toEqual([]);
    expect(sanitizeDecisionRecords({ records: [] })).toEqual([]);
  });
});
