import { FormEvent, useEffect, useMemo, useState } from "react";
import { buildActionQueueView, listActionOwners, toggleActionId } from "./actionQueue";
import type { SeverityFilter } from "./actionQueue";
import { buildBoardPacket, CONTROL_BOUNDARY } from "./boardPacket";
import { buildBoardroomShareUrl, parseBoardroomShareHash } from "./boardroomShareLink";
import { buildBoardroomView } from "./boardroom";
import { createOpportunityFromDraft, seedOpportunities, STAGES } from "./data";
import {
  createDecisionRecord,
  DECISION_TYPES,
  decisionsForWorkflow,
  latestDecisionForWorkflow,
  REVIEW_WINDOWS,
  summarizeDecisionPosture
} from "./decisions";
import type { DecisionRecord, DecisionType, ReviewWindow } from "./decisions";
import { calculateEnterpriseReadiness } from "./enterpriseReadiness";
import {
  clearPersistedState,
  getDefaultAssumptions,
  loadPersistedState,
  savePersistedState,
  STORAGE_VERSION
} from "./persistence";
import type { PersistedState } from "./persistence";
import {
  buildPortfolioBusinessCase,
  buildOperatingActions,
  buildWeeklyOperatingAgenda,
  calculatePortfolioEconomics,
  formatCompactCurrency,
  formatCurrency,
  investmentGates,
  rankPortfolioContributors
} from "./portfolio";
import { buildPortfolioSnapshot, parsePortfolioSnapshot } from "./portfolioSnapshot";
import {
  buildExecutiveBrief,
  calculateApprovalReadiness,
  calculateGovernanceReadiness,
  calculateQualityReadiness,
  calculateSourceReadiness,
  countOpenApprovals,
  getNextGate
} from "./readiness";
import { riskSortWeight } from "./scoring";
import { getScenarioPreset, matchScenario, scenarioPresets } from "./scenarios";
import type { ScenarioId, ScenarioSelection } from "./scenarios";
import {
  alignmentSignals,
  architectureLanes,
  executiveAsks,
  pilotRoadmap,
  platformFitByArea
} from "./strategy";
import type {
  AiOpportunity,
  ApprovalStatus,
  CheckStatus,
  CxArea,
  IntakeDraft,
  KnowledgeSource,
  RiskTier,
  SensitivityLevel,
  WorkflowStage
} from "./types";
import {
  clearWorkflowActionState,
  updateApprovalStatus,
  updateQualityCheckStatus,
  updateSourceTrust
} from "./workflowControls";

const cxAreas: CxArea[] = [
  "Professional Services",
  "Customer Adoption",
  "Managed Services",
  "Customer Enablement"
];

const sensitivities: SensitivityLevel[] = ["Low", "Moderate", "Sensitive", "Restricted"];
const riskFilters: Array<RiskTier | "All"> = ["All", "High", "Medium", "Low"];
const severityFilters: SeverityFilter[] = ["All", "Critical", "High", "Medium", "Watch"];
const approvalStatuses: ApprovalStatus[] = ["Required", "Ready", "Approved"];
const checkStatuses: CheckStatus[] = ["Not started", "In review", "Passed", "Blocked"];
const sourceTrustLevels: Array<KnowledgeSource["trust"]> = ["Needs review", "Medium", "High"];

type ActiveView = "Executive" | "Boardroom" | "Portfolio" | "Pilot" | "Workflow";

const workspaceViews: Array<{ id: ActiveView; label: string; summary: string }> = [
  { id: "Executive", label: "Executive", summary: "Value case" },
  { id: "Boardroom", label: "Boardroom", summary: "Read-only packet" },
  { id: "Portfolio", label: "Portfolio", summary: "Intake and board" },
  { id: "Pilot", label: "Pilot", summary: "Plan and controls" },
  { id: "Workflow", label: "Workflow", summary: "Selected detail" }
];

function isActiveView(value: string | null): value is ActiveView {
  return value === "Executive" || value === "Boardroom" || value === "Portfolio" || value === "Pilot" || value === "Workflow";
}

const defaultDraft: IntakeDraft = {
  title: "Customer onboarding status brief",
  cxArea: "Professional Services",
  owner: "CX AI Architect",
  painPoint:
    "Owners need a reviewed, source-linked brief before customer status calls so risks and next actions do not live in scattered notes.",
  workflowVolume: 32,
  value: 78,
  feasibility: 72,
  risk: 46,
  strategicAlignment: 84,
  urgency: 70,
  sensitivity: "Moderate",
  sensitiveActionApproval: true
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function todayStamp(): string {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function nowStamp(): string {
  const now = new Date();

  return `${todayStamp()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

type CopyState = "idle" | "copied" | "failed";

interface InitialAppState {
  state: PersistedState;
  shareMessage: string | null;
  shareError: string | null;
}

function loadInitialAppState(): InitialAppState {
  const shared = typeof window === "undefined" ? null : parseBoardroomShareHash(window.location.hash);

  if (shared?.ok) {
    return {
      state: {
        version: STORAGE_VERSION,
        opportunities: shared.state.opportunities,
        selectedId: shared.state.selectedId,
        activeView: "Boardroom",
        assumptions: shared.state.assumptions,
        scenario: shared.state.scenario,
        decisions: shared.state.decisions,
        completedActionIds: shared.state.completedActionIds,
        snoozedActionIds: shared.state.snoozedActionIds
      },
      shareMessage: "Loaded Boardroom snapshot from shared link.",
      shareError: null
    };
  }

  if (shared && !shared.ok) {
    return {
      state: loadPersistedState(),
      shareMessage: null,
      shareError: `Shared Boardroom link could not load: ${shared.error}`
    };
  }

  return { state: loadPersistedState(), shareMessage: null, shareError: null };
}

const initialAppState = loadInitialAppState();
const initialState = initialAppState.state;

function App() {
  const [opportunities, setOpportunities] = useState<AiOpportunity[]>(initialState.opportunities ?? seedOpportunities);
  const [selectedId, setSelectedId] = useState(initialState.selectedId ?? seedOpportunities[0].id);
  const [stageFilter, setStageFilter] = useState<WorkflowStage | "All">("All");
  const [riskFilter, setRiskFilter] = useState<RiskTier | "All">("All");
  const [draft, setDraft] = useState<IntakeDraft>(defaultDraft);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [businessCaseCopyState, setBusinessCaseCopyState] = useState<CopyState>("idle");
  const [packetCopyState, setPacketCopyState] = useState<CopyState>("idle");
  const [snapshotCopyState, setSnapshotCopyState] = useState<CopyState>("idle");
  const [boardroomLinkCopyState, setBoardroomLinkCopyState] = useState<CopyState>("idle");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importDraft, setImportDraft] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importedSnapshot, setImportedSnapshot] = useState(false);
  const [shareMessage, setShareMessage] = useState(initialAppState.shareMessage);
  const [shareError, setShareError] = useState(initialAppState.shareError);
  const [portfolioAssumptions, setPortfolioAssumptions] = useState(initialState.assumptions ?? getDefaultAssumptions());
  const [scenario, setScenario] = useState<ScenarioSelection>(initialState.scenario ?? "Base");
  const [activeView, setActiveView] = useState<ActiveView>(
    isActiveView(initialState.activeView) ? initialState.activeView : "Executive"
  );
  const [decisions, setDecisions] = useState<DecisionRecord[]>(initialState.decisions);
  const [completedActionIds, setCompletedActionIds] = useState<string[]>(initialState.completedActionIds);
  const [snoozedActionIds, setSnoozedActionIds] = useState<string[]>(initialState.snoozedActionIds);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");
  const [ownerFilter, setOwnerFilter] = useState<string>("All");

  useEffect(() => {
    savePersistedState({
      opportunities,
      selectedId,
      activeView,
      assumptions: portfolioAssumptions,
      scenario,
      decisions,
      completedActionIds,
      snoozedActionIds
    });
  }, [opportunities, selectedId, activeView, portfolioAssumptions, scenario, decisions, completedActionIds, snoozedActionIds]);

  const selected = opportunities.find((item) => item.id === selectedId) ?? opportunities[0];
  const selectedDecisions = selected ? decisionsForWorkflow(decisions, selected.id) : [];
  const selectedLatestDecision = selected ? latestDecisionForWorkflow(decisions, selected.id) : null;
  const selectedReadiness = selected ? calculateGovernanceReadiness(selected) : 0;
  const selectedBrief = selected ? buildExecutiveBrief(selected, selectedLatestDecision) : "";
  const selectedGate = selected ? getNextGate(selected) : "Intake a workflow to begin";
  const portfolioEconomics = useMemo(
    () => calculatePortfolioEconomics(opportunities, portfolioAssumptions),
    [opportunities, portfolioAssumptions]
  );
  const portfolioContributors = useMemo(
    () => rankPortfolioContributors(opportunities, portfolioAssumptions),
    [opportunities, portfolioAssumptions]
  );
  const portfolioBusinessCase = useMemo(
    () => buildPortfolioBusinessCase(opportunities, portfolioEconomics, portfolioContributors, scenario),
    [opportunities, portfolioContributors, portfolioEconomics, scenario]
  );
  const operatingActions = useMemo(
    () => buildOperatingActions(opportunities, portfolioAssumptions),
    [opportunities, portfolioAssumptions]
  );
  const queueState = useMemo(
    () => ({ completedIds: completedActionIds, snoozedIds: snoozedActionIds }),
    [completedActionIds, snoozedActionIds]
  );
  const fullQueue = useMemo(() => buildActionQueueView(operatingActions, queueState), [operatingActions, queueState]);
  const enterpriseReadiness = useMemo(
    () => calculateEnterpriseReadiness(opportunities, portfolioEconomics, fullQueue.open, decisions),
    [opportunities, portfolioEconomics, fullQueue, decisions]
  );
  const filteredQueue = useMemo(
    () => buildActionQueueView(operatingActions, queueState, { severity: severityFilter, owner: ownerFilter }),
    [operatingActions, queueState, severityFilter, ownerFilter]
  );
  const actionOwners = useMemo(() => listActionOwners(operatingActions), [operatingActions]);
  const weeklyAgenda = useMemo(
    () => buildWeeklyOperatingAgenda(opportunities, portfolioEconomics, fullQueue.open),
    [opportunities, portfolioEconomics, fullQueue]
  );
  const decisionSummary = useMemo(
    () => summarizeDecisionPosture(opportunities, decisions),
    [opportunities, decisions]
  );
  const portfolioSnapshot = useMemo(
    () =>
      buildPortfolioSnapshot({
        opportunities,
        selectedId,
        activeView,
        assumptions: portfolioAssumptions,
        scenario,
        decisions,
        completedActionIds,
        snoozedActionIds
      }),
    [
      opportunities,
      selectedId,
      activeView,
      portfolioAssumptions,
      scenario,
      decisions,
      completedActionIds,
      snoozedActionIds
    ]
  );
  const boardroomShareSnapshot = useMemo(
    () =>
      buildPortfolioSnapshot(
        {
          opportunities,
          selectedId,
          activeView: "Boardroom",
          assumptions: portfolioAssumptions,
          scenario,
          decisions,
          completedActionIds,
          snoozedActionIds
        },
        new Date().toISOString(),
        0
      ),
    [
      opportunities,
      selectedId,
      portfolioAssumptions,
      scenario,
      decisions,
      completedActionIds,
      snoozedActionIds
    ]
  );
  const boardroomShareUrl = useMemo(
    () => (typeof window === "undefined" ? "" : buildBoardroomShareUrl(boardroomShareSnapshot, window.location.href)),
    [boardroomShareSnapshot]
  );

  useEffect(() => {
    setSnapshotCopyState("idle");
  }, [portfolioSnapshot]);

  useEffect(() => {
    setBoardroomLinkCopyState("idle");
  }, [boardroomShareUrl]);

  const boardPacket = useMemo(
    () =>
      buildBoardPacket({
        scenarioName: scenario,
        opportunities,
        economics: portfolioEconomics,
        contributors: portfolioContributors,
        openActions: fullQueue.open,
        completedActions: fullQueue.completed,
        agenda: weeklyAgenda,
        decisions,
        enterpriseReadiness
      }),
    [
      scenario,
      opportunities,
      portfolioEconomics,
      portfolioContributors,
      fullQueue,
      weeklyAgenda,
      decisions,
      enterpriseReadiness
    ]
  );
  const boardroomView = useMemo(
    () =>
      buildBoardroomView({
        scenarioName: scenario,
        opportunities,
        economics: portfolioEconomics,
        contributors: portfolioContributors,
        openActions: fullQueue.open,
        completedActions: fullQueue.completed,
        agenda: weeklyAgenda,
        decisions,
        enterpriseReadiness
      }),
    [
      scenario,
      opportunities,
      portfolioEconomics,
      portfolioContributors,
      fullQueue,
      weeklyAgenda,
      decisions,
      enterpriseReadiness
    ]
  );

  const visibleOpportunities = useMemo(() => {
    return opportunities
      .filter((item) => stageFilter === "All" || item.stage === stageFilter)
      .filter((item) => riskFilter === "All" || item.scores.tier === riskFilter)
      .sort((a, b) => {
        const riskDelta = riskSortWeight(b.scores.tier) - riskSortWeight(a.scores.tier);

        if (riskDelta !== 0) {
          return riskDelta;
        }

        return b.scores.priority - a.scores.priority;
      });
  }, [opportunities, riskFilter, stageFilter]);

  const metrics = useMemo(() => {
    const openApprovals = opportunities.reduce((total, item) => total + countOpenApprovals(item), 0);
    const governanceReady = opportunities.filter(
      (item) => calculateGovernanceReadiness(item) >= 70 && countOpenApprovals(item) === 0
    ).length;

    return { openApprovals, governanceReady };
  }, [opportunities]);

  const openActionableCount = fullQueue.open.filter((action) => action.severity !== "Watch").length;

  function updateDraft<K extends keyof IntakeDraft>(field: K, value: IntakeDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updatePortfolioAssumption<K extends keyof typeof portfolioAssumptions>(
    field: K,
    value: (typeof portfolioAssumptions)[K]
  ) {
    const next = { ...portfolioAssumptions, [field]: value };

    setPortfolioAssumptions(next);
    setScenario(matchScenario(next));
  }

  function applyScenario(id: ScenarioId) {
    setPortfolioAssumptions({ ...getScenarioPreset(id).assumptions });
    setScenario(id);
    setBusinessCaseCopyState("idle");
    setPacketCopyState("idle");
    setSnapshotCopyState("idle");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const opportunity = createOpportunityFromDraft(draft, opportunities.length + 1);
    setOpportunities((current) => [opportunity, ...current]);
    setSelectedId(opportunity.id);
    setCopyState("idle");
    setBusinessCaseCopyState("idle");
    setPacketCopyState("idle");
    setSnapshotCopyState("idle");
    setStageFilter("All");
    setRiskFilter("All");
    setActiveView("Workflow");
  }

  function selectOpportunity(id: string) {
    setSelectedId(id);
    setCopyState("idle");
    setActiveView("Workflow");
  }

  function moveSelected(stage: WorkflowStage) {
    if (!selected) {
      return;
    }

    setOpportunities((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              stage,
              auditLog: [
                {
                  timestamp: nowStamp(),
                  actor: "CX AI Architect",
                  event: `Stage moved to ${stage}`
                },
                ...item.auditLog
              ]
            }
          : item
      )
    );
  }

  function clearSelectedWorkflowQueueState(workflowId: string) {
    setCompletedActionIds((current) => clearWorkflowActionState(workflowId, current));
    setSnoozedActionIds((current) => clearWorkflowActionState(workflowId, current));
    setCopyState("idle");
    setBusinessCaseCopyState("idle");
    setPacketCopyState("idle");
    setSnapshotCopyState("idle");
  }

  function updateSelectedApproval(index: number, status: ApprovalStatus) {
    if (!selected) {
      return;
    }

    const timestamp = nowStamp();

    setOpportunities((current) =>
      current.map((item) =>
        item.id === selected.id ? updateApprovalStatus(item, index, status, "CX AI Architect", timestamp) : item
      )
    );
    clearSelectedWorkflowQueueState(selected.id);
  }

  function updateSelectedQualityCheck(index: number, status: CheckStatus) {
    if (!selected) {
      return;
    }

    const timestamp = nowStamp();

    setOpportunities((current) =>
      current.map((item) =>
        item.id === selected.id ? updateQualityCheckStatus(item, index, status, "CX AI Architect", timestamp) : item
      )
    );
    clearSelectedWorkflowQueueState(selected.id);
  }

  function updateSelectedSourceTrust(index: number, trust: KnowledgeSource["trust"]) {
    if (!selected) {
      return;
    }

    const timestamp = nowStamp();

    setOpportunities((current) =>
      current.map((item) =>
        item.id === selected.id ? updateSourceTrust(item, index, trust, "CX AI Architect", timestamp) : item
      )
    );
    clearSelectedWorkflowQueueState(selected.id);
  }

  function recordDecision(input: {
    decision: DecisionType;
    owner: string;
    reason: string;
    evidenceRequired: string;
    nextReviewWindow: ReviewWindow;
  }): string | null {
    if (!selected) {
      return "Select a workflow before recording a decision.";
    }

    const record = createDecisionRecordSafe(selected.id, input, decisions.length + 1);

    if (!record) {
      return "Owner and reason are required to record a decision.";
    }

    setDecisions((current) => [record, ...current]);
    setOpportunities((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              auditLog: [
                {
                  timestamp: nowStamp(),
                  actor: record.owner,
                  event: `Decision recorded: ${record.decision} — ${record.reason}`
                },
                ...item.auditLog
              ]
            }
          : item
      )
    );

    return null;
  }

  function markActionDone(actionId: string) {
    setCompletedActionIds((current) => toggleActionId(current, actionId));
    setSnoozedActionIds((current) => current.filter((id) => id !== actionId));
  }

  function snoozeAction(actionId: string) {
    setSnoozedActionIds((current) => toggleActionId(current, actionId));
  }

  function toggleImportPanel() {
    setIsImportOpen((current) => !current);
    setImportError(null);
    setImportedSnapshot(false);
  }

  function applySnapshotImport() {
    const parsed = parsePortfolioSnapshot(importDraft);

    if (!parsed.ok) {
      setImportError(parsed.error);
      setImportedSnapshot(false);
      return;
    }

    setOpportunities(parsed.state.opportunities);
    setSelectedId(parsed.state.selectedId);
    setActiveView(isActiveView(parsed.state.activeView) ? parsed.state.activeView : "Executive");
    setPortfolioAssumptions(parsed.state.assumptions);
    setScenario(parsed.state.scenario);
    setDecisions(parsed.state.decisions);
    setCompletedActionIds(parsed.state.completedActionIds);
    setSnoozedActionIds(parsed.state.snoozedActionIds);
    setStageFilter("All");
    setRiskFilter("All");
    setSeverityFilter("All");
    setOwnerFilter("All");
    setCopyState("idle");
    setBusinessCaseCopyState("idle");
    setPacketCopyState("idle");
    setSnapshotCopyState("idle");
    setImportError(null);
    setImportedSnapshot(true);
    setShareMessage(null);
    setShareError(null);
  }

  function resetDemoData() {
    const confirmed = window.confirm("Reset demo data? This clears added workflows, decisions, and action states.");

    if (!confirmed) {
      return;
    }

    clearPersistedState();
    setOpportunities(seedOpportunities);
    setSelectedId(seedOpportunities[0].id);
    setActiveView("Executive");
    setPortfolioAssumptions(getDefaultAssumptions());
    setScenario("Base");
    setDecisions([]);
    setCompletedActionIds([]);
    setSnoozedActionIds([]);
    setStageFilter("All");
    setRiskFilter("All");
    setSeverityFilter("All");
    setOwnerFilter("All");
    setDraft(defaultDraft);
    setCopyState("idle");
    setBusinessCaseCopyState("idle");
    setPacketCopyState("idle");
    setSnapshotCopyState("idle");
    setImportDraft("");
    setImportError(null);
    setImportedSnapshot(false);
    setIsImportOpen(false);
    setShareMessage(null);
    setShareError(null);
  }

  async function copyToClipboard(text: string, setState: (state: CopyState) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Vena CX AI portfolio OS</p>
          <h1>CX AI Operating Command Center</h1>
          <p className="header-subtitle">
            A fundable portfolio system for governed AI workflows, CX adoption, executive controls, and measurable value.
          </p>
        </div>
        <div className="header-side">
          <div className="header-actions" aria-label="Operating cadence">
            <span>Intake</span>
            <span>Score</span>
            <span>Build</span>
            <span>Measure</span>
          </div>
          <div className="header-button-row">
            <button
              className="ghost-button"
              type="button"
              onClick={() => copyToClipboard(portfolioSnapshot, setSnapshotCopyState)}
            >
              {snapshotCopyState === "copied" ? "Snapshot copied" : snapshotCopyState === "failed" ? "Copy failed" : "Export snapshot"}
            </button>
            <button className="ghost-button" type="button" onClick={toggleImportPanel}>
              Import snapshot
            </button>
            <button className="ghost-button" type="button" onClick={resetDemoData}>
              Reset demo data
            </button>
          </div>
        </div>
      </header>

      {isImportOpen && (
        <section className="snapshot-panel" aria-label="Portfolio snapshot import">
          <div className="section-title-row">
            <h2>Import portfolio snapshot</h2>
            <button className="mini-button" type="button" onClick={toggleImportPanel}>
              Close
            </button>
          </div>
          <textarea
            value={importDraft}
            onChange={(event) => {
              setImportDraft(event.target.value);
              setImportError(null);
              setImportedSnapshot(false);
            }}
            rows={6}
            placeholder="Paste a Vena CX AI Portfolio OS snapshot JSON export here."
          />
          <div className="snapshot-actions">
            <button className="secondary-button" type="button" onClick={applySnapshotImport}>
              Import snapshot
            </button>
            {importError && <span className="form-error">{importError}</span>}
            {importedSnapshot && !importError && <span className="form-success">Snapshot imported.</span>}
          </div>
        </section>
      )}

      {(shareMessage || shareError) && (
        <section className={`share-banner ${shareError ? "error" : ""}`} aria-label="Shared boardroom link status">
          <span>{shareError ?? shareMessage}</span>
          <button
            className="mini-button"
            type="button"
            onClick={() => {
              setShareMessage(null);
              setShareError(null);
            }}
          >
            Dismiss
          </button>
        </section>
      )}

      <section className="metric-strip" aria-label="Cadence summary">
        <Metric label="Modeled value" value={formatCompactCurrency(portfolioEconomics.annualizedValue)} suffix="/yr" tone="green" />
        <Metric label="ROI" value={portfolioEconomics.roiMultiple.toFixed(1)} suffix="x" tone="amber" />
        <Metric label="Enterprise ready" value={enterpriseReadiness.overallScore} suffix="/100" tone="blue" />
        <Metric label="Action queue" value={openActionableCount} suffix="open" tone="red" />
      </section>

      <nav className="view-tabs" aria-label="Workspace views">
        {workspaceViews.map((view) => (
          <button
            key={view.id}
            type="button"
            className={activeView === view.id ? "active" : ""}
            onClick={() => setActiveView(view.id)}
          >
            <span>{view.label}</span>
            <em>{view.summary}</em>
          </button>
        ))}
      </nav>

      {activeView === "Executive" && (
        <>
      <section className="business-case-panel" aria-label="Executive business case">
        <div className="panel-heading command-heading">
          <div>
            <p className="eyebrow">Executive command center</p>
            <h2>Million-dollar CX AI pilot case</h2>
            <p>
              A deterministic value model that ties governed CX workflows to annual capacity, customer acceleration,
              control maturity, payback, and scale decisions.
            </p>
          </div>
          <div className="heading-buttons">
            <button
              className="secondary-button"
              type="button"
              onClick={() => copyToClipboard(boardPacket, setPacketCopyState)}
            >
              {packetCopyState === "copied" ? "Packet copied" : packetCopyState === "failed" ? "Copy failed" : "Copy weekly board packet"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => copyToClipboard(portfolioBusinessCase, setBusinessCaseCopyState)}
            >
              {businessCaseCopyState === "copied"
                ? "Copied"
                : businessCaseCopyState === "failed"
                  ? "Copy failed"
                  : "Copy business case"}
            </button>
          </div>
        </div>

        <div className="business-case-grid">
          <div className="value-metric-grid">
            <Metric label="Modeled value" value={formatCompactCurrency(portfolioEconomics.annualizedValue)} suffix="/yr" tone="green" />
            <Metric label="Net value" value={formatCompactCurrency(portfolioEconomics.netAnnualValue)} suffix="/yr" tone="blue" />
            <Metric label="ROI" value={portfolioEconomics.roiMultiple.toFixed(1)} suffix="x" tone="amber" />
            <Metric label="Payback" value={portfolioEconomics.paybackMonths} suffix="months" tone="gray" />
            <Metric label="Capacity" value={portfolioEconomics.annualHoursRecovered.toLocaleString("en-US")} suffix="hrs/yr" tone="blue" />
            <Metric label="Confidence" value={portfolioEconomics.confidenceScore} suffix="/100" tone="green" />
          </div>

          <div className="enterprise-readiness-panel">
            <div className="section-title-row">
              <h3>Enterprise readiness</h3>
              <span className={`status-pill ${enterpriseReadiness.status.toLowerCase()}`}>
                {enterpriseReadiness.status}
              </span>
            </div>
            <div className="enterprise-score">
              <strong>{enterpriseReadiness.overallScore}</strong>
              <span>/100</span>
              <p>{enterpriseReadiness.executiveSignal}</p>
            </div>
            <div className="enterprise-dimensions">
              {enterpriseReadiness.dimensions.map((dimension) => (
                <article key={dimension.label}>
                  <div>
                    <strong>{dimension.label}</strong>
                    <span>{dimension.score}/100</span>
                  </div>
                  <p>{dimension.signal}</p>
                  <em>{dimension.nextMove}</em>
                </article>
              ))}
            </div>
          </div>

          <div className="assumption-panel">
            <div className="section-title-row">
              <h3>Scenario planner</h3>
              <span className="scenario-state">{scenario}</span>
            </div>
            <div className="scenario-row" role="group" aria-label="Scenario presets">
              {scenarioPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={scenario === preset.id ? "active" : ""}
                  onClick={() => applyScenario(preset.id)}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="scenario-note">
              {scenario === "Custom"
                ? "Custom assumptions in play. Pick a preset to return to a named scenario."
                : getScenarioPreset(scenario as ScenarioId).description}
            </p>
            <Slider
              label="Loaded CX cost"
              value={portfolioAssumptions.loadedHourlyCost}
              min={75}
              max={175}
              prefix="$"
              suffix="/hr"
              onChange={(value) => updatePortfolioAssumption("loadedHourlyCost", value)}
            />
            <Slider
              label="Rollout scale"
              value={portfolioAssumptions.scaleMultiplier}
              min={1}
              max={6}
              suffix="x"
              onChange={(value) => updatePortfolioAssumption("scaleMultiplier", value)}
            />
            <Slider
              label="Adoption coverage"
              value={portfolioAssumptions.adoptionCoverage}
              min={40}
              max={95}
              suffix="%"
              onChange={(value) => updatePortfolioAssumption("adoptionCoverage", value)}
            />
            <div className="value-breakdown">
              <span>
                Capacity value <strong>{formatCurrency(portfolioEconomics.capacityValue)}</strong>
              </span>
              <span>
                Acceleration value <strong>{formatCurrency(portfolioEconomics.accelerationValue)}</strong>
              </span>
              <span>
                Control value <strong>{formatCurrency(portfolioEconomics.controlValue)}</strong>
              </span>
              <span>
                Pilot investment <strong>{formatCurrency(portfolioEconomics.pilotInvestment)}</strong>
              </span>
              <span>
                Delay cost <strong>{formatCurrency(portfolioAssumptions.cxDelayCostPerDay)}/day</strong>
              </span>
            </div>
          </div>

          <div className="business-memo">
            <div className="section-title-row">
              <h3>Board-ready memo</h3>
              <span>{portfolioEconomics.governanceReadyCount} workflows release-ready</span>
            </div>
            <pre>{portfolioBusinessCase}</pre>
          </div>

          <div className="scale-candidate-panel">
            <h3>Scale candidates</h3>
            {portfolioContributors.length === 0 ? (
              <EmptyState
                title="No workflows scored yet"
                hint="Add workflows through Portfolio intake to build the scale shortlist."
              />
            ) : (
              <>
                {portfolioEconomics.governanceReadyCount === 0 && (
                  <p className="panel-note">No workflow is release-ready yet. Clear approvals and QA gates first.</p>
                )}
                <ol>
                  {portfolioContributors.slice(0, 3).map((candidate) => (
                    <li key={candidate.id}>
                      <span>{formatCurrency(candidate.contribution)}</span>
                      <strong>{candidate.title}</strong>
                      <p>{candidate.nextGate}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>

          <div className="action-queue-panel">
            <div className="section-title-row">
              <h3>Weekly action queue</h3>
              <span>
                {fullQueue.urgentCount} urgent | {formatCurrency(fullQueue.blockedValueAtStake)} blocked
              </span>
            </div>

            <div className="queue-controls">
              <label>
                Severity
                <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}>
                  {severityFilters.map((filter) => (
                    <option key={filter}>{filter}</option>
                  ))}
                </select>
              </label>
              <label>
                Owner
                <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
                  <option>All</option>
                  {actionOwners.map((owner) => (
                    <option key={owner}>{owner}</option>
                  ))}
                </select>
              </label>
            </div>

            {filteredQueue.open.length === 0 ? (
              <EmptyState
                title="No blocked actions in this view"
                hint={
                  fullQueue.open.length === 0
                    ? "Every queue item is done or snoozed. Review released workflows for scale evidence."
                    : "No open actions match the current filters. Reset severity or owner to see the full queue."
                }
              />
            ) : (
              <ol>
                {filteredQueue.open.slice(0, 5).map((action) => (
                  <li key={action.id}>
                    <span className={`severity-pill ${action.severity.toLowerCase()}`}>{action.severity}</span>
                    <div className="action-body">
                      <strong>{action.action}</strong>
                      <p>{action.workflowTitle}</p>
                      <em>
                        {action.owner} | {action.due} | {formatCurrency(action.valueAtStake)} at stake
                      </em>
                    </div>
                    <div className="action-buttons">
                      <button className="mini-button" type="button" onClick={() => markActionDone(action.id)}>
                        Done
                      </button>
                      <button className="mini-button" type="button" onClick={() => snoozeAction(action.id)}>
                        Snooze
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {filteredQueue.open.length > 5 && (
              <p className="panel-note">+{filteredQueue.open.length - 5} more open actions in the queue.</p>
            )}

            {fullQueue.snoozed.length > 0 && (
              <div className="queue-subsection">
                <h4>Snoozed until next review</h4>
                <ul className="compact-action-list">
                  {fullQueue.snoozed.map((action) => (
                    <li key={action.id}>
                      <span>
                        {action.action} ({action.workflowTitle})
                      </span>
                      <button className="mini-button" type="button" onClick={() => snoozeAction(action.id)}>
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="queue-subsection">
              <h4>Completed this week</h4>
              {fullQueue.completed.length === 0 ? (
                <p className="panel-note">Nothing completed yet. Mark actions done as owners clear them.</p>
              ) : (
                <ul className="compact-action-list completed">
                  {fullQueue.completed.map((action) => (
                    <li key={action.id}>
                      <span>
                        {action.action} ({action.workflowTitle})
                      </span>
                      <button className="mini-button" type="button" onClick={() => markActionDone(action.id)}>
                        Reopen
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="decision-summary-panel">
            <div className="section-title-row">
              <h3>Portfolio decisions</h3>
              <span>
                {decisionSummary.decidedWorkflows} decided | {decisionSummary.undecidedWorkflows} pending
              </span>
            </div>
            {decisionSummary.latestDecisions.length === 0 ? (
              <EmptyState
                title="No decisions yet"
                hint="Record Fund / Hold / Scale / Pause / Retire calls in the Workflow tab. They land here and in the board packet."
              />
            ) : (
              <>
                <div className="decision-chips">
                  {DECISION_TYPES.map((type) =>
                    decisionSummary.counts[type] > 0 ? (
                      <span key={type} className={`decision-pill ${type.toLowerCase()}`}>
                        {type} {decisionSummary.counts[type]}
                      </span>
                    ) : null
                  )}
                </div>
                <ul className="decision-roll">
                  {decisionSummary.latestDecisions.slice(0, 4).map((entry) => (
                    <li key={entry.record.id}>
                      <span className={`decision-pill ${entry.record.decision.toLowerCase()}`}>{entry.record.decision}</span>
                      <div>
                        <strong>{entry.workflowTitle}</strong>
                        <p>
                          {entry.record.date} | {entry.record.owner} | next review {entry.record.nextReviewWindow}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="weekly-agenda-panel">
            <h3>Weekly operating review</h3>
            <ol>
              {weeklyAgenda.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>

          <div className="investment-gates">
            <h3>Investment gates</h3>
            {investmentGates.map((gate) => (
              <article key={gate.label}>
                <span>{gate.label}</span>
                <strong>{gate.condition}</strong>
                <p>{gate.decision}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="leadership-strip" aria-label="Portfolio operating summary">
        <article>
          <span>Portfolio signal</span>
          <strong>
            {metrics.governanceReady > 0
              ? `${metrics.governanceReady} governed workflows ready for release motion`
              : "No release-ready workflows yet — clear gates before scaling"}
          </strong>
          <p>Backlog quality is judged by releaseability, not idea volume.</p>
        </article>
        <article>
          <span>Control posture</span>
          <strong>{metrics.openApprovals} human gates still open</strong>
          <p>Sensitive actions remain draft-and-review until owner approval clears.</p>
        </article>
        <article>
          <span>Current executive bet</span>
          <strong>{selected ? selected.title : "Portfolio intake pending"}</strong>
          <p>{selectedGate}</p>
        </article>
      </section>
        </>
      )}

      {activeView === "Boardroom" && (
      <section className="boardroom-view" aria-label="Boardroom packet">
        <div className="boardroom-hero">
          <div>
            <p className="eyebrow">Read-only board packet</p>
            <h2>Leadership decision view</h2>
            <p>{boardroomView.posture}</p>
          </div>
          <div className="boardroom-actions">
            <button className="secondary-button" type="button" onClick={() => copyToClipboard(boardPacket, setPacketCopyState)}>
              {packetCopyState === "copied" ? "Packet copied" : packetCopyState === "failed" ? "Copy failed" : "Copy weekly board packet"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => copyToClipboard(boardroomShareUrl, setBoardroomLinkCopyState)}
            >
              {boardroomLinkCopyState === "copied" ? "Link copied" : boardroomLinkCopyState === "failed" ? "Copy failed" : "Copy Boardroom link"}
            </button>
          </div>
        </div>

        <div className="boardroom-decision">
          <span>Decision posture</span>
          <strong>{boardroomView.decision}</strong>
        </div>

        <div className="boardroom-metrics">
          {boardroomView.metrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.helper}</p>
            </article>
          ))}
        </div>

        <div className="boardroom-sections">
          {boardroomView.sections.map((section) => (
            <article key={section.title}>
              <h3>{section.title}</h3>
              {section.items.length === 0 ? (
                <p className="panel-note">{section.emptyState}</p>
              ) : (
                <ol>
                  {section.items.map((item, index) => (
                    <li key={`${section.title}-${index}`}>
                      <strong>{item.primary}</strong>
                      <p>{item.secondary}</p>
                      <em>{item.meta}</em>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))}
        </div>

        <div className="boardroom-boundary">
          <strong>Control boundary</strong>
          <p>{boardroomView.controlBoundary}</p>
        </div>
      </section>
      )}

      {activeView === "Pilot" && (
      <section className="alignment-grid" aria-label="Vena operating alignment">
        {alignmentSignals.map((signal) => (
          <article key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.headline}</strong>
            <p>{signal.body}</p>
            <em>{signal.proof}</em>
          </article>
        ))}
      </section>
      )}

      {activeView === "Portfolio" && (
      <div className="workspace-grid">
        <section className="panel intake-panel" aria-labelledby="intake-title">
          <div className="panel-heading">
            <p className="eyebrow">Inbound request</p>
            <h2 id="intake-title">Workflow intake</h2>
          </div>

          <form onSubmit={handleSubmit} className="intake-form">
            <label>
              Workflow
              <input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                maxLength={80}
              />
            </label>

            <label>
              CX area
              <select
                value={draft.cxArea}
                onChange={(event) => updateDraft("cxArea", event.target.value as CxArea)}
              >
                {cxAreas.map((area) => (
                  <option key={area}>{area}</option>
                ))}
              </select>
            </label>

            <label>
              Owner
              <input
                value={draft.owner}
                onChange={(event) => updateDraft("owner", event.target.value)}
                maxLength={64}
              />
            </label>

            <label>
              Pain point
              <textarea
                value={draft.painPoint}
                onChange={(event) => updateDraft("painPoint", event.target.value)}
                rows={4}
                maxLength={320}
              />
            </label>

            <div className="split-fields">
              <label>
                Monthly runs
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={draft.workflowVolume}
                  onChange={(event) => updateDraft("workflowVolume", Number(event.target.value))}
                />
              </label>
              <label>
                Sensitivity
                <select
                  value={draft.sensitivity}
                  onChange={(event) => updateDraft("sensitivity", event.target.value as SensitivityLevel)}
                >
                  {sensitivities.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </label>
            </div>

            <Slider label="Business value" value={draft.value} onChange={(value) => updateDraft("value", value)} />
            <Slider
              label="Feasibility"
              value={draft.feasibility}
              onChange={(value) => updateDraft("feasibility", value)}
            />
            <Slider label="Risk" value={draft.risk} onChange={(value) => updateDraft("risk", value)} />
            <Slider
              label="Strategic fit"
              value={draft.strategicAlignment}
              onChange={(value) => updateDraft("strategicAlignment", value)}
            />
            <Slider label="Urgency" value={draft.urgency} onChange={(value) => updateDraft("urgency", value)} />

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.sensitiveActionApproval}
                onChange={(event) => updateDraft("sensitiveActionApproval", event.target.checked)}
              />
              Human approval required before write/send action
            </label>

            <button className="primary-button" type="submit">
              Add to backlog
            </button>
          </form>
        </section>

        <section className="board-panel" aria-labelledby="board-title">
          <div className="panel-heading board-heading">
            <div>
              <p className="eyebrow">Opportunity backlog</p>
              <h2 id="board-title">Governed AI workflow board</h2>
            </div>
            <div className="filter-row">
              <label>
                Stage
                <select
                  value={stageFilter}
                  onChange={(event) => setStageFilter(event.target.value as WorkflowStage | "All")}
                >
                  <option>All</option>
                  {STAGES.map((stage) => (
                    <option key={stage}>{stage}</option>
                  ))}
                </select>
              </label>
              <label>
                Risk
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value as RiskTier | "All")}
                >
                  {riskFilters.map((filter) => (
                    <option key={filter}>{filter}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {opportunities.length === 0 ? (
            <EmptyState
              title="No workflows in the portfolio"
              hint="Use the intake form to add the first CX AI workflow candidate."
            />
          ) : (
          <div className="board-grid">
            {STAGES.map((stage) => {
              const stageItems = visibleOpportunities.filter((item) => item.stage === stage);

              return (
                <div className="stage-column" key={stage}>
                  <div className="stage-header">
                    <h3>{stage}</h3>
                    <span>{stageItems.length}</span>
                  </div>
                  <div className="stage-stack">
                    {stageItems.length === 0 && <p className="stage-empty">Nothing in {stage} for this filter.</p>}
                    {stageItems.map((item) => (
                      <button
                        type="button"
                        className={`opportunity-card ${selected && item.id === selected.id ? "selected" : ""}`}
                        key={item.id}
                        onClick={() => selectOpportunity(item.id)}
                      >
                        <span className="card-topline">
                          <span>{item.cxArea}</span>
                          <RiskBadge tier={item.scores.tier} />
                        </span>
                        <strong>{item.title}</strong>
                        <span className="card-meta">
                          <span>{item.owner}</span>
                          <span>{item.sensitivity}</span>
                          {latestDecisionForWorkflow(decisions, item.id) && (
                            <span className={`decision-pill ${latestDecisionForWorkflow(decisions, item.id)?.decision.toLowerCase()}`}>
                              {latestDecisionForWorkflow(decisions, item.id)?.decision}
                            </span>
                          )}
                        </span>
                        <span className="card-copy">{item.painPoint}</span>
                        <span className="gate-line">{getNextGate(item)}</span>
                        <span className="score-row">
                          <ScoreBar label="Priority" value={item.scores.priority} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </section>
      </div>
      )}

      {activeView === "Pilot" && (
      <section className="operating-row" aria-label="Governance architecture and pilot roadmap">
        <article className="architecture-panel">
          <div className="panel-heading compact-heading">
            <div>
              <p className="eyebrow">Pilot architecture</p>
              <h2>Governed CX AI delivery loop</h2>
            </div>
            <span className="release-contract">Draft-first, source-linked, human-approved</span>
          </div>

          <div className="architecture-lanes">
            {architectureLanes.map((lane) => (
              <section className="architecture-lane" key={lane.step}>
                <span className="lane-step">{lane.step}</span>
                <div>
                  <h3>{lane.title}</h3>
                  <p>{lane.owner}</p>
                </div>
                <div className="lane-columns">
                  <div>
                    <strong>Inputs</strong>
                    <ul>
                      {lane.inputs.map((input) => (
                        <li key={input}>{input}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Controls</strong>
                    <ul>
                      {lane.controls.map((control) => (
                        <li key={control}>{control}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <em>{lane.outcome}</em>
              </section>
            ))}
          </div>
        </article>

        <article className="roadmap-panel">
          <div className="panel-heading compact-heading">
            <div>
              <p className="eyebrow">90-day motion</p>
              <h2>Launch plan for Vena CX</h2>
            </div>
          </div>

          <div className="roadmap-track">
            {pilotRoadmap.map((milestone) => (
              <section className="roadmap-item" key={milestone.window}>
                <span>{milestone.window}</span>
                <h3>{milestone.focus}</h3>
                <p>{milestone.outcome}</p>
                <strong>{milestone.proof}</strong>
                <em>{milestone.owner}</em>
              </section>
            ))}
          </div>

          <div className="executive-asks">
            <h3>Leadership asks</h3>
            <ul>
              {executiveAsks.map((ask) => (
                <li key={ask}>{ask}</li>
              ))}
            </ul>
          </div>
        </article>
      </section>
      )}

      {activeView === "Workflow" && !selected && (
        <section className="detail-panel">
          <EmptyState
            title="No workflow selected"
            hint="Add a workflow through Portfolio intake, then open it here for governance detail."
          />
        </section>
      )}

      {activeView === "Workflow" && selected && (
      <section className="detail-panel" aria-labelledby="detail-title">
        <div className="detail-title-row">
          <div>
            <p className="eyebrow">{selected.cxArea}</p>
            <h2 id="detail-title">{selected.title}</h2>
            <p className="detail-subtitle">
              Governance readiness {selectedReadiness}/100. {selectedGate}.
            </p>
            {selectedLatestDecision && (
              <span className={`decision-pill ${selectedLatestDecision.decision.toLowerCase()}`}>
                {selectedLatestDecision.decision} · {selectedLatestDecision.date}
              </span>
            )}
          </div>
          <div className="stage-actions" aria-label="Move selected workflow">
            {STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                className={selected.stage === stage ? "active" : ""}
                onClick={() => moveSelected(stage)}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-section brief-section">
            <div className="section-title-row">
              <h3>Executive handoff brief</h3>
              <button
                className="secondary-button"
                type="button"
                onClick={() => copyToClipboard(selectedBrief, setCopyState)}
              >
                {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy brief"}
              </button>
            </div>
            <pre>{selectedBrief}</pre>
          </div>

          <div className="detail-section readiness-section">
            <h3>Readiness gates</h3>
            <div className="readiness-list">
              <span>
                Approval readiness <strong>{calculateApprovalReadiness(selected)}/100</strong>
              </span>
              <span>
                QA readiness <strong>{calculateQualityReadiness(selected)}/100</strong>
              </span>
              <span>
                Source readiness <strong>{calculateSourceReadiness(selected)}/100</strong>
              </span>
              <span>
                Open approvals <strong>{countOpenApprovals(selected)}</strong>
              </span>
            </div>
          </div>

          <div className="detail-section score-section">
            <h3>Scorecard</h3>
            <ScoreBar label="Value" value={selected.scores.value} />
            <ScoreBar label="Feasibility" value={selected.scores.feasibility} />
            <ScoreBar label="Risk" value={selected.scores.risk} inverse />
            <ScoreBar label="Strategic fit" value={selected.scores.strategicAlignment} />
            <ScoreBar label="Urgency" value={selected.scores.urgency} />
            <div className="score-summary">
              <span>Priority {selected.scores.priority}/100</span>
              <RiskBadge tier={selected.scores.tier} />
            </div>
          </div>

          <DetailList title="Vena platform fit" items={platformFitByArea[selected.cxArea]} />
          <EvidenceControlPanel
            opportunity={selected}
            onApprovalStatusChange={updateSelectedApproval}
            onQualityStatusChange={updateSelectedQualityCheck}
            onSourceTrustChange={updateSelectedSourceTrust}
          />
          <DetailList title="Tool and API action plan" items={selected.integrationPlan.map((step) => `${step.system}: ${step.action}. Approval: ${step.approval}`)} />
          <DetailList title="Release and handoff" items={selected.releaseNotes} />
          <DetailList title="Adoption playbook" items={selected.adoptionPlaybook} />

          <div className="detail-section impact-section">
            <h3>Impact model</h3>
            <div className="impact-grid">
              <Metric label="Saved" value={selected.impact.hoursSavedPerWeek} suffix="hrs/wk" tone="green" />
              <Metric label="TTV shift" value={selected.impact.timeToValueDays} suffix="days" tone="amber" />
              <Metric label="Adoption" value={selected.impact.adoptionReadiness} suffix="/100" tone="blue" />
              <Metric label="Data lift" value={selected.impact.dataQualityLift} suffix="/100" tone="gray" />
            </div>
          </div>

          <DecisionPanel
            key={selected.id}
            workflowOwner={selected.owner}
            history={selectedDecisions}
            onRecord={recordDecision}
          />

          <div className="detail-section audit-section">
            <h3>Audit log</h3>
            <ol>
              {selected.auditLog.map((event, index) => (
                <li key={`${event.timestamp}-${index}`}>
                  <span>{event.timestamp}</span>
                  <strong>{event.actor}</strong>
                  <p>{event.event}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      )}

      <footer className="app-footer">
        <p>{CONTROL_BOUNDARY}</p>
        <p>Demo state persists in this browser only. Use “Reset demo data” to return to the seeded portfolio.</p>
      </footer>
    </main>
  );
}

function createDecisionRecordSafe(
  workflowId: string,
  input: {
    decision: DecisionType;
    owner: string;
    reason: string;
    evidenceRequired: string;
    nextReviewWindow: ReviewWindow;
  },
  sequence: number
): DecisionRecord | null {
  return createDecisionRecord(
    {
      workflowId,
      decision: input.decision,
      owner: input.owner,
      date: todayStamp(),
      reason: input.reason,
      evidenceRequired: input.evidenceRequired,
      nextReviewWindow: input.nextReviewWindow
    },
    sequence
  );
}

function EvidenceControlPanel({
  opportunity,
  onApprovalStatusChange,
  onQualityStatusChange,
  onSourceTrustChange
}: {
  opportunity: AiOpportunity;
  onApprovalStatusChange: (index: number, status: ApprovalStatus) => void;
  onQualityStatusChange: (index: number, status: CheckStatus) => void;
  onSourceTrustChange: (index: number, trust: KnowledgeSource["trust"]) => void;
}) {
  return (
    <div className="detail-section evidence-control-section">
      <div className="section-title-row">
        <h3>Evidence controls</h3>
        <span>{calculateGovernanceReadiness(opportunity)}/100 ready</span>
      </div>

      <div className="evidence-control-grid">
        <section>
          <h4>Sources</h4>
          {opportunity.knowledgeSources.map((source, index) => (
            <label className="evidence-control-row" key={`${source.name}-${index}`}>
              <span>
                <strong>{source.name}</strong>
                <em>{source.owner}</em>
              </span>
              <select
                aria-label={`${source.name} source trust`}
                value={source.trust}
                onChange={(event) => onSourceTrustChange(index, event.target.value as KnowledgeSource["trust"])}
              >
                {sourceTrustLevels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
          ))}
        </section>

        <section>
          <h4>Approvals</h4>
          {opportunity.approvals.map((approval, index) => (
            <label className="evidence-control-row" key={`${approval.label}-${index}`}>
              <span>
                <strong>{approval.label}</strong>
                <em>{approval.owner}</em>
              </span>
              <select
                aria-label={`${approval.label} approval status`}
                value={approval.status}
                onChange={(event) => onApprovalStatusChange(index, event.target.value as ApprovalStatus)}
              >
                {approvalStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          ))}
        </section>

        <section>
          <h4>QA evidence</h4>
          {opportunity.qaChecklist.map((check, index) => (
            <label className="evidence-control-row" key={`${check.label}-${index}`}>
              <span>
                <strong>{check.label}</strong>
                <em>Evaluation gate</em>
              </span>
              <select
                aria-label={`${check.label} QA status`}
                value={check.status}
                onChange={(event) => onQualityStatusChange(index, event.target.value as CheckStatus)}
              >
                {checkStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          ))}
        </section>
      </div>
    </div>
  );
}

function DecisionPanel({
  workflowOwner,
  history,
  onRecord
}: {
  workflowOwner: string;
  history: DecisionRecord[];
  onRecord: (input: {
    decision: DecisionType;
    owner: string;
    reason: string;
    evidenceRequired: string;
    nextReviewWindow: ReviewWindow;
  }) => string | null;
}) {
  const [decision, setDecision] = useState<DecisionType>("Fund");
  const [owner, setOwner] = useState(workflowOwner);
  const [reason, setReason] = useState("");
  const [evidenceRequired, setEvidenceRequired] = useState("");
  const [nextReviewWindow, setNextReviewWindow] = useState<ReviewWindow>("2 weeks");
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const failure = onRecord({ decision, owner, reason, evidenceRequired, nextReviewWindow });

    if (failure) {
      setError(failure);
      setRecorded(false);
      return;
    }

    setError(null);
    setRecorded(true);
    setReason("");
    setEvidenceRequired("");
  }

  return (
    <div className="detail-section decision-section">
      <h3>Decision record</h3>
      <form className="decision-form" onSubmit={handleSubmit}>
        <div className="decision-form-row">
          <label>
            Decision
            <select value={decision} onChange={(event) => setDecision(event.target.value as DecisionType)}>
              {DECISION_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Owner
            <input value={owner} onChange={(event) => setOwner(event.target.value)} maxLength={64} />
          </label>
          <label>
            Next review
            <select
              value={nextReviewWindow}
              onChange={(event) => setNextReviewWindow(event.target.value as ReviewWindow)}
            >
              {REVIEW_WINDOWS.map((window) => (
                <option key={window}>{window}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Reason
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={160}
            placeholder="Why this call, in one sentence"
          />
        </label>
        <label>
          Evidence required
          <input
            value={evidenceRequired}
            onChange={(event) => setEvidenceRequired(event.target.value)}
            maxLength={160}
            placeholder="What proof unlocks the next review"
          />
        </label>
        <div className="decision-form-footer">
          <button className="secondary-button" type="submit">
            Record decision
          </button>
          {error && <span className="form-error">{error}</span>}
          {recorded && !error && <span className="form-success">Recorded.</span>}
        </div>
      </form>

      <h4>History</h4>
      {history.length === 0 ? (
        <p className="panel-note">No decisions recorded for this workflow yet.</p>
      ) : (
        <ul className="decision-history">
          {history.map((record) => (
            <li key={record.id}>
              <span className={`decision-pill ${record.decision.toLowerCase()}`}>{record.decision}</span>
              <div>
                <strong>
                  {record.date} | {record.owner} | next review {record.nextReviewWindow}
                </strong>
                <p>{record.reason}</p>
                <em>Evidence: {record.evidenceRequired}</em>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}

function Slider({
  label,
  value,
  min = 0,
  max = 100,
  prefix = "",
  suffix = "",
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-field">
      <span>
        {label}
        <strong>
          {prefix}
          {value}
          {suffix}
        </strong>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ScoreBar({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  return (
    <div className="score-bar">
      <span>
        {label}
        <strong>{value}</strong>
      </span>
      <progress className={inverse ? "bar-track inverse" : "bar-track"} value={value} max="100" />
    </div>
  );
}

function RiskBadge({ tier }: { tier: RiskTier }) {
  return <span className={`risk-badge ${tier.toLowerCase()}`}>{tier}</span>;
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="detail-section">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="panel-note">Nothing documented yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  tone
}: {
  label: string;
  value: number | string;
  suffix: string;
  tone: "green" | "blue" | "red" | "amber" | "gray";
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{suffix}</em>
    </div>
  );
}

export default App;
