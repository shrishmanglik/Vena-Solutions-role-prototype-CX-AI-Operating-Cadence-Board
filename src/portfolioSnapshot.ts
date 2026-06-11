import { sanitizeActionIds } from "./actionQueue";
import { sanitizeDecisionRecords } from "./decisions";
import type { SaveStateInput } from "./persistence";
import { sanitizeAssumptions, sanitizeOpportunities } from "./persistence";
import { isScenarioSelection } from "./scenarios";

export const SNAPSHOT_SCHEMA = "vena-cx-ai-portfolio-os-snapshot";
export const SNAPSHOT_VERSION = 1;

const activeViews = ["Executive", "Boardroom", "Portfolio", "Pilot", "Workflow"] as const;

export interface PortfolioSnapshot {
  schema: typeof SNAPSHOT_SCHEMA;
  version: typeof SNAPSHOT_VERSION;
  exportedAt: string;
  state: SaveStateInput;
}

export type SnapshotParseResult =
  | {
      ok: true;
      state: SaveStateInput;
    }
  | {
      ok: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isActiveView(value: unknown): value is SaveStateInput["activeView"] {
  return activeViews.includes(value as (typeof activeViews)[number]);
}

export function buildPortfolioSnapshot(input: SaveStateInput, exportedAt = new Date().toISOString()): string {
  const snapshot: PortfolioSnapshot = {
    schema: SNAPSHOT_SCHEMA,
    version: SNAPSHOT_VERSION,
    exportedAt,
    state: input
  };

  return JSON.stringify(snapshot, null, 2);
}

export function parsePortfolioSnapshot(raw: string): SnapshotParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Snapshot is not valid JSON." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "Snapshot must be a JSON object." };
  }

  if (parsed.schema !== SNAPSHOT_SCHEMA || parsed.version !== SNAPSHOT_VERSION || !isRecord(parsed.state)) {
    return { ok: false, error: "Snapshot schema is not supported." };
  }

  const state = parsed.state;
  const opportunities = sanitizeOpportunities(state.opportunities);

  if (!opportunities) {
    return { ok: false, error: "Snapshot does not contain a valid workflow portfolio." };
  }

  const assumptions = sanitizeAssumptions(state.assumptions);

  if (!assumptions) {
    return { ok: false, error: "Snapshot does not contain valid portfolio assumptions." };
  }

  const selectedId =
    isNonEmptyString(state.selectedId) && opportunities.some((opportunity) => opportunity.id === state.selectedId)
      ? state.selectedId
      : opportunities[0].id;

  return {
    ok: true,
    state: {
      opportunities,
      selectedId,
      activeView: isActiveView(state.activeView) ? state.activeView : "Executive",
      assumptions,
      scenario: isScenarioSelection(state.scenario) ? state.scenario : "Custom",
      decisions: sanitizeDecisionRecords(state.decisions),
      completedActionIds: sanitizeActionIds(state.completedActionIds),
      snoozedActionIds: sanitizeActionIds(state.snoozedActionIds)
    }
  };
}
