import type { OperatingAction, OperatingActionSeverity } from "./portfolio";

export type SeverityFilter = OperatingActionSeverity | "All";

export type OwnerFilter = string;

export interface ActionQueueState {
  completedIds: string[];
  snoozedIds: string[];
}

export interface ActionQueueFilters {
  severity: SeverityFilter;
  owner: OwnerFilter;
}

export interface ActionQueueView {
  open: OperatingAction[];
  completed: OperatingAction[];
  snoozed: OperatingAction[];
  urgentCount: number;
  criticalCount: number;
  blockedValueAtStake: number;
}

export const emptyActionQueueState: ActionQueueState = {
  completedIds: [],
  snoozedIds: []
};

export const defaultActionQueueFilters: ActionQueueFilters = {
  severity: "All",
  owner: "All"
};

function isUrgent(action: OperatingAction): boolean {
  return action.severity === "Critical" || action.due === "48 hrs";
}

export function listActionOwners(actions: OperatingAction[]): string[] {
  return [...new Set(actions.map((action) => action.owner))].sort((a, b) => a.localeCompare(b));
}

export function buildActionQueueView(
  actions: OperatingAction[],
  state: ActionQueueState,
  filters: ActionQueueFilters = defaultActionQueueFilters
): ActionQueueView {
  const completedIds = new Set(state.completedIds);
  const snoozedIds = new Set(state.snoozedIds);

  const completed = actions.filter((action) => completedIds.has(action.id));
  const snoozed = actions.filter((action) => !completedIds.has(action.id) && snoozedIds.has(action.id));
  const allOpen = actions.filter((action) => !completedIds.has(action.id) && !snoozedIds.has(action.id));

  const open = allOpen
    .filter((action) => filters.severity === "All" || action.severity === filters.severity)
    .filter((action) => filters.owner === "All" || action.owner === filters.owner);

  const blocking = allOpen.filter((action) => action.severity === "Critical" || action.severity === "High");

  return {
    open,
    completed,
    snoozed,
    urgentCount: allOpen.filter(isUrgent).length,
    criticalCount: allOpen.filter((action) => action.severity === "Critical").length,
    blockedValueAtStake: blocking.reduce((total, action) => total + action.valueAtStake, 0)
  };
}

export function toggleActionId(ids: string[], actionId: string): string[] {
  return ids.includes(actionId) ? ids.filter((id) => id !== actionId) : [...ids, actionId];
}

export function sanitizeActionIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return [...new Set(raw.filter((id): id is string => typeof id === "string" && id.length > 0))];
}
