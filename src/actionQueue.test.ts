import { describe, expect, it } from "vitest";
import {
  buildActionQueueView,
  defaultActionQueueFilters,
  emptyActionQueueState,
  listActionOwners,
  sanitizeActionIds,
  toggleActionId
} from "./actionQueue";
import { seedOpportunities } from "./data";
import { buildOperatingActions } from "./portfolio";

const actions = buildOperatingActions(seedOpportunities);

describe("action queue state", () => {
  it("keeps every action open with empty state", () => {
    const view = buildActionQueueView(actions, emptyActionQueueState);

    expect(view.open).toHaveLength(actions.length);
    expect(view.completed).toHaveLength(0);
    expect(view.snoozed).toHaveLength(0);
  });

  it("moves completed actions out of the open queue but keeps them visible", () => {
    const doneId = actions[0].id;
    const view = buildActionQueueView(actions, { completedIds: [doneId], snoozedIds: [] });

    expect(view.open.map((action) => action.id)).not.toContain(doneId);
    expect(view.completed.map((action) => action.id)).toContain(doneId);
  });

  it("snoozes actions without marking them complete", () => {
    const snoozedId = actions[0].id;
    const view = buildActionQueueView(actions, { completedIds: [], snoozedIds: [snoozedId] });

    expect(view.open.map((action) => action.id)).not.toContain(snoozedId);
    expect(view.snoozed.map((action) => action.id)).toContain(snoozedId);
    expect(view.completed).toHaveLength(0);
  });

  it("treats completion as stronger than snooze", () => {
    const id = actions[0].id;
    const view = buildActionQueueView(actions, { completedIds: [id], snoozedIds: [id] });

    expect(view.completed.map((action) => action.id)).toContain(id);
    expect(view.snoozed).toHaveLength(0);
  });

  it("filters the open queue by severity and owner", () => {
    const criticalOnly = buildActionQueueView(actions, emptyActionQueueState, { severity: "Critical", owner: "All" });

    expect(criticalOnly.open.length).toBeGreaterThan(0);
    expect(criticalOnly.open.every((action) => action.severity === "Critical")).toBe(true);

    const owner = actions[0].owner;
    const ownerOnly = buildActionQueueView(actions, emptyActionQueueState, { severity: "All", owner });

    expect(ownerOnly.open.length).toBeGreaterThan(0);
    expect(ownerOnly.open.every((action) => action.owner === owner)).toBe(true);
  });

  it("counts urgent actions and blocked value from the unfiltered open queue", () => {
    const view = buildActionQueueView(actions, emptyActionQueueState, { severity: "Watch", owner: "All" });
    const expectedBlockedValue = actions
      .filter((action) => action.severity === "Critical" || action.severity === "High")
      .reduce((total, action) => total + action.valueAtStake, 0);

    expect(view.urgentCount).toBeGreaterThan(0);
    expect(view.criticalCount).toBeGreaterThan(0);
    expect(view.blockedValueAtStake).toBe(expectedBlockedValue);
  });

  it("releases blocked value when the blocking action completes", () => {
    const critical = actions.find((action) => action.severity === "Critical");
    const before = buildActionQueueView(actions, emptyActionQueueState);
    const after = buildActionQueueView(actions, { completedIds: [critical?.id ?? ""], snoozedIds: [] });

    expect(after.blockedValueAtStake).toBeLessThan(before.blockedValueAtStake);
  });

  it("lists unique owners alphabetically", () => {
    const owners = listActionOwners(actions);

    expect(owners.length).toBe(new Set(owners).size);
    expect([...owners].sort((a, b) => a.localeCompare(b))).toEqual(owners);
  });

  it("toggles ids on and off", () => {
    expect(toggleActionId([], "a-1")).toEqual(["a-1"]);
    expect(toggleActionId(["a-1"], "a-1")).toEqual([]);
  });

  it("sanitizes persisted id lists defensively", () => {
    expect(sanitizeActionIds(["a", "a", "", 7, null, "b"])).toEqual(["a", "b"]);
    expect(sanitizeActionIds("not-an-array")).toEqual([]);
  });

  it("honors default filters", () => {
    expect(defaultActionQueueFilters).toEqual({ severity: "All", owner: "All" });
  });
});
