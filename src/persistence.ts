import { sanitizeActionIds } from "./actionQueue";
import { sanitizeDecisionRecords } from "./decisions";
import type { DecisionRecord } from "./decisions";
import { defaultPortfolioAssumptions } from "./portfolio";
import type { PortfolioAssumptions } from "./portfolio";
import { isScenarioSelection } from "./scenarios";
import type { ScenarioSelection } from "./scenarios";
import type {
  AiOpportunity,
  ApprovalStatus,
  CheckStatus,
  CxArea,
  RiskTier,
  SensitivityLevel,
  WorkflowStage
} from "./types";

export const STORAGE_KEY = "vena-cx-portfolio-os-state";
export const STORAGE_VERSION = 1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistedState {
  version: number;
  opportunities: AiOpportunity[] | null;
  selectedId: string | null;
  activeView: string | null;
  assumptions: PortfolioAssumptions | null;
  scenario: ScenarioSelection | null;
  decisions: DecisionRecord[];
  completedActionIds: string[];
  snoozedActionIds: string[];
}

export const emptyPersistedState: PersistedState = {
  version: STORAGE_VERSION,
  opportunities: null,
  selectedId: null,
  activeView: null,
  assumptions: null,
  scenario: null,
  decisions: [],
  completedActionIds: [],
  snoozedActionIds: []
};

const cxAreas: CxArea[] = ["Professional Services", "Customer Adoption", "Managed Services", "Customer Enablement"];
const stages: WorkflowStage[] = ["Intake", "Scored", "Build / QA", "Released"];
const sensitivities: SensitivityLevel[] = ["Low", "Moderate", "Sensitive", "Restricted"];
const riskTiers: RiskTier[] = ["Low", "Medium", "High"];
const checkStatuses: CheckStatus[] = ["Not started", "In review", "Passed", "Blocked"];
const approvalStatuses: ApprovalStatus[] = ["Required", "Ready", "Approved"];
const sourceTrustLevels = ["High", "Medium", "Needs review"] as const;

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  return window.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function asFiniteNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(min, Math.min(max, value));
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T);
}

function sanitizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isNonEmptyString);
}

function sanitizeOpportunity(raw: unknown): AiOpportunity | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.title) || !isNonEmptyString(raw.owner)) {
    return null;
  }

  if (!isOneOf(raw.cxArea, cxAreas) || !isOneOf(raw.stage, stages) || !isOneOf(raw.sensitivity, sensitivities)) {
    return null;
  }

  const workflowVolume = asFiniteNumber(raw.workflowVolume, 1, 5000);

  if (workflowVolume === null || !isRecord(raw.scores) || !isRecord(raw.impact)) {
    return null;
  }

  const scoreFields = ["value", "feasibility", "risk", "strategicAlignment", "urgency", "priority"] as const;
  const scores: Partial<AiOpportunity["scores"]> = {};

  for (const field of scoreFields) {
    const parsed = asFiniteNumber(raw.scores[field], 0, 100);

    if (parsed === null) {
      return null;
    }

    scores[field] = Math.round(parsed);
  }

  if (!isOneOf(raw.scores.tier, riskTiers)) {
    return null;
  }

  const hoursSavedPerWeek = asFiniteNumber(raw.impact.hoursSavedPerWeek, 0, 10000);
  const timeToValueDays = asFiniteNumber(raw.impact.timeToValueDays, 0, 365);
  const adoptionReadiness = asFiniteNumber(raw.impact.adoptionReadiness, 0, 100);
  const dataQualityLift = asFiniteNumber(raw.impact.dataQualityLift, 0, 100);

  if (hoursSavedPerWeek === null || timeToValueDays === null || adoptionReadiness === null || dataQualityLift === null) {
    return null;
  }

  const knowledgeSources = Array.isArray(raw.knowledgeSources)
    ? raw.knowledgeSources.flatMap((entry) => {
        if (!isRecord(entry) || !isNonEmptyString(entry.name) || !isNonEmptyString(entry.owner)) {
          return [];
        }

        return isOneOf(entry.trust, sourceTrustLevels) ? [{ name: entry.name, owner: entry.owner, trust: entry.trust }] : [];
      })
    : [];

  const integrationPlan = Array.isArray(raw.integrationPlan)
    ? raw.integrationPlan.flatMap((entry) =>
        isRecord(entry) && isNonEmptyString(entry.system) && isNonEmptyString(entry.action) && isNonEmptyString(entry.approval)
          ? [{ system: entry.system, action: entry.action, approval: entry.approval }]
          : []
      )
    : [];

  const approvals = Array.isArray(raw.approvals)
    ? raw.approvals.flatMap((entry) =>
        isRecord(entry) && isNonEmptyString(entry.label) && isNonEmptyString(entry.owner) && isOneOf(entry.status, approvalStatuses)
          ? [{ label: entry.label, owner: entry.owner, status: entry.status }]
          : []
      )
    : [];

  const qaChecklist = Array.isArray(raw.qaChecklist)
    ? raw.qaChecklist.flatMap((entry) =>
        isRecord(entry) && isNonEmptyString(entry.label) && isOneOf(entry.status, checkStatuses)
          ? [{ label: entry.label, status: entry.status }]
          : []
      )
    : [];

  const auditLog = Array.isArray(raw.auditLog)
    ? raw.auditLog.flatMap((entry) =>
        isRecord(entry) && isNonEmptyString(entry.timestamp) && isNonEmptyString(entry.actor) && isNonEmptyString(entry.event)
          ? [{ timestamp: entry.timestamp, actor: entry.actor, event: entry.event }]
          : []
      )
    : [];

  return {
    id: raw.id,
    title: raw.title,
    cxArea: raw.cxArea,
    owner: raw.owner,
    stage: raw.stage,
    painPoint: isNonEmptyString(raw.painPoint) ? raw.painPoint : "Pain point pending discovery.",
    workflowVolume: Math.round(workflowVolume),
    sensitivity: raw.sensitivity,
    scores: { ...(scores as AiOpportunity["scores"]), tier: raw.scores.tier },
    knowledgeSources,
    integrationPlan,
    approvals,
    qaChecklist,
    releaseNotes: sanitizeStringList(raw.releaseNotes),
    adoptionPlaybook: sanitizeStringList(raw.adoptionPlaybook),
    impact: {
      hoursSavedPerWeek: Math.round(hoursSavedPerWeek),
      timeToValueDays: Math.round(timeToValueDays),
      adoptionReadiness: Math.round(adoptionReadiness),
      dataQualityLift: Math.round(dataQualityLift)
    },
    auditLog
  };
}

export function sanitizeOpportunities(raw: unknown): AiOpportunity[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const opportunities = raw
    .map((entry) => sanitizeOpportunity(entry))
    .filter((entry): entry is AiOpportunity => entry !== null);

  return opportunities.length > 0 ? opportunities : null;
}

export function sanitizeAssumptions(raw: unknown): PortfolioAssumptions | null {
  if (!isRecord(raw)) {
    return null;
  }

  const loadedHourlyCost = asFiniteNumber(raw.loadedHourlyCost, 40, 400);
  const scaleMultiplier = asFiniteNumber(raw.scaleMultiplier, 1, 12);
  const adoptionCoverage = asFiniteNumber(raw.adoptionCoverage, 0, 100);
  const pilotInvestment = asFiniteNumber(raw.pilotInvestment, 0, 5000000);
  const cxDelayCostPerDay = asFiniteNumber(raw.cxDelayCostPerDay, 0, 100000);

  if (
    loadedHourlyCost === null ||
    scaleMultiplier === null ||
    adoptionCoverage === null ||
    pilotInvestment === null ||
    cxDelayCostPerDay === null
  ) {
    return null;
  }

  return { loadedHourlyCost, scaleMultiplier, adoptionCoverage, pilotInvestment, cxDelayCostPerDay };
}

export function loadPersistedState(storage: StorageLike | null = defaultStorage()): PersistedState {
  if (!storage) {
    return { ...emptyPersistedState };
  }

  let parsed: unknown;

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...emptyPersistedState };
    }

    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyPersistedState };
  }

  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) {
    return { ...emptyPersistedState };
  }

  return {
    version: STORAGE_VERSION,
    opportunities: sanitizeOpportunities(parsed.opportunities),
    selectedId: isNonEmptyString(parsed.selectedId) ? parsed.selectedId : null,
    activeView: isNonEmptyString(parsed.activeView) ? parsed.activeView : null,
    assumptions: sanitizeAssumptions(parsed.assumptions),
    scenario: isScenarioSelection(parsed.scenario) ? parsed.scenario : null,
    decisions: sanitizeDecisionRecords(parsed.decisions),
    completedActionIds: sanitizeActionIds(parsed.completedActionIds),
    snoozedActionIds: sanitizeActionIds(parsed.snoozedActionIds)
  };
}

export interface SaveStateInput {
  opportunities: AiOpportunity[];
  selectedId: string;
  activeView: string;
  assumptions: PortfolioAssumptions;
  scenario: ScenarioSelection;
  decisions: DecisionRecord[];
  completedActionIds: string[];
  snoozedActionIds: string[];
}

export function savePersistedState(input: SaveStateInput, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...input }));
    return true;
  } catch {
    return false;
  }
}

export function clearPersistedState(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private mode, blocked). Reset still works in-memory.
  }
}

export function getDefaultAssumptions(): PortfolioAssumptions {
  return { ...defaultPortfolioAssumptions };
}
