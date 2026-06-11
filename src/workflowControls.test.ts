import { describe, expect, it } from "vitest";
import { seedOpportunities } from "./data";
import { buildOperatingActions } from "./portfolio";
import {
  clearWorkflowActionState,
  updateApprovalStatus,
  updateQualityCheckStatus,
  updateSourceTrust
} from "./workflowControls";

describe("workflow controls", () => {
  it("updates approval state without mutating the original workflow", () => {
    const workflow = seedOpportunities[0];
    const updated = updateApprovalStatus(workflow, 1, "Approved", "CX AI Architect", "2026-06-11 09:00");

    expect(updated).not.toBe(workflow);
    expect(updated.approvals[1].status).toBe("Approved");
    expect(workflow.approvals[1].status).toBe("Required");
    expect(updated.auditLog[0].event).toContain("Approval updated");
  });

  it("updates QA evidence state and records an audit event", () => {
    const workflow = seedOpportunities[1];
    const updated = updateQualityCheckStatus(workflow, 1, "Passed", "CX AI Architect", "2026-06-11 09:05");

    expect(updated.qaChecklist[1].status).toBe("Passed");
    expect(updated.auditLog[0].event).toContain("QA evidence updated");
  });

  it("updates source trust and leaves unchanged values untouched", () => {
    const workflow = seedOpportunities[0];
    const updated = updateSourceTrust(workflow, 2, "High", "CX AI Architect", "2026-06-11 09:10");
    const unchanged = updateSourceTrust(updated, 2, "High", "CX AI Architect", "2026-06-11 09:11");

    expect(updated.knowledgeSources[2].trust).toBe("High");
    expect(updated.auditLog[0].event).toContain("Source trust updated");
    expect(unchanged).toBe(updated);
  });

  it("clears stale action completion state for a changed workflow", () => {
    expect(clearWorkflowActionState("cx-001", ["cx-001-approval", "cx-002-approval", "cx-001-qa-review"])).toEqual([
      "cx-002-approval"
    ]);
  });

  it("lets evidence edits move the operating queue to the next real gate", () => {
    const workflow = seedOpportunities[0];
    const initialAction = buildOperatingActions([workflow])[0];
    const approvedOnce = updateApprovalStatus(workflow, 1, "Approved", "CX AI Architect", "2026-06-11 09:15");
    const approvedTwice = updateApprovalStatus(approvedOnce, 2, "Approved", "CX AI Architect", "2026-06-11 09:16");
    const nextAction = buildOperatingActions([approvedTwice])[0];

    expect(initialAction.id).toBe("cx-001-approval");
    expect(nextAction.id).toBe("cx-001-qa-review");
    expect(nextAction.action).toContain("Finish QA review");
  });
});
