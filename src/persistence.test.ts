import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import { createDecisionRecord } from "./decisions";
import type { DecisionRecord } from "./decisions";
import { defaultPortfolioAssumptions } from "./portfolio";
import {
  clearPersistedState,
  loadPersistedState,
  sanitizeAssumptions,
  sanitizeOpportunities,
  savePersistedState,
  STORAGE_KEY,
  STORAGE_VERSION
} from "./persistence";
import type { SaveStateInput, StorageLike } from "./persistence";

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };

  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    }
  };
}

function sampleState(): SaveStateInput {
  const decision = createDecisionRecord(
    {
      workflowId: seedOpportunities[0].id,
      decision: "Fund",
      owner: "CX VP",
      date: "2026-06-10",
      reason: "Value and controls cleared the gate.",
      evidenceRequired: "Pilot evidence pack.",
      nextReviewWindow: "2 weeks"
    },
    1
  ) as DecisionRecord;

  return {
    opportunities: seedOpportunities,
    selectedId: seedOpportunities[1].id,
    activeView: "Workflow",
    assumptions: { ...defaultPortfolioAssumptions, adoptionCoverage: 75 },
    scenario: "Custom",
    decisions: [decision],
    completedActionIds: ["cx-001-approval"],
    snoozedActionIds: ["cx-004-approval"]
  };
}

describe("persistence", () => {
  it("round-trips operating state through storage", () => {
    const storage = createMemoryStorage();
    const saved = savePersistedState(sampleState(), storage);
    const loaded = loadPersistedState(storage);

    expect(saved).toBe(true);
    expect(loaded.opportunities).toHaveLength(seedOpportunities.length);
    expect(loaded.selectedId).toBe(seedOpportunities[1].id);
    expect(loaded.activeView).toBe("Workflow");
    expect(loaded.assumptions?.adoptionCoverage).toBe(75);
    expect(loaded.scenario).toBe("Custom");
    expect(loaded.decisions).toHaveLength(1);
    expect(loaded.completedActionIds).toEqual(["cx-001-approval"]);
    expect(loaded.snoozedActionIds).toEqual(["cx-004-approval"]);
  });

  it("returns safe defaults when storage is empty or unavailable", () => {
    expect(loadPersistedState(createMemoryStorage()).opportunities).toBeNull();
    expect(loadPersistedState(null).opportunities).toBeNull();
  });

  it("survives corrupted JSON without crashing", () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: "{not json" });
    const loaded = loadPersistedState(storage);

    expect(loaded.opportunities).toBeNull();
    expect(loaded.decisions).toEqual([]);
  });

  it("discards payloads from unknown schema versions", () => {
    const storage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify({ version: STORAGE_VERSION + 99, opportunities: seedOpportunities })
    });

    expect(loadPersistedState(storage).opportunities).toBeNull();
  });

  it("drops malformed slices while keeping valid ones", () => {
    const storage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: STORAGE_VERSION,
        opportunities: [seedOpportunities[0], { id: "broken" }, 42],
        selectedId: "",
        activeView: "Portfolio",
        assumptions: { loadedHourlyCost: "lots" },
        scenario: "Moonshot",
        decisions: [{ decision: "Fund" }],
        completedActionIds: ["ok", 9],
        snoozedActionIds: null
      })
    });

    const loaded = loadPersistedState(storage);

    expect(loaded.opportunities).toHaveLength(1);
    expect(loaded.opportunities?.[0].id).toBe(seedOpportunities[0].id);
    expect(loaded.selectedId).toBeNull();
    expect(loaded.activeView).toBe("Portfolio");
    expect(loaded.assumptions).toBeNull();
    expect(loaded.scenario).toBeNull();
    expect(loaded.decisions).toEqual([]);
    expect(loaded.completedActionIds).toEqual(["ok"]);
    expect(loaded.snoozedActionIds).toEqual([]);
  });

  it("clears persisted state for the demo reset", () => {
    const storage = createMemoryStorage();
    savePersistedState(sampleState(), storage);
    clearPersistedState(storage);

    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadPersistedState(storage).opportunities).toBeNull();
  });

  it("rejects opportunity lists that sanitize to empty", () => {
    expect(sanitizeOpportunities([])).toBeNull();
    expect(sanitizeOpportunities([{ id: "x" }])).toBeNull();
    expect(sanitizeOpportunities("nope")).toBeNull();
  });

  it("clamps and validates assumptions", () => {
    expect(sanitizeAssumptions(null)).toBeNull();
    expect(sanitizeAssumptions({ ...defaultPortfolioAssumptions, scaleMultiplier: Number.NaN })).toBeNull();

    const clamped = sanitizeAssumptions({ ...defaultPortfolioAssumptions, adoptionCoverage: 400 });

    expect(clamped?.adoptionCoverage).toBe(100);
  });
});
