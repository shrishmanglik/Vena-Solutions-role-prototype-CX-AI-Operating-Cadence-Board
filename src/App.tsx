import { FormEvent, useMemo, useState } from "react";
import { createOpportunityFromDraft, seedOpportunities, STAGES } from "./data";
import {
  buildPortfolioBusinessCase,
  buildOperatingActions,
  buildWeeklyOperatingAgenda,
  calculatePortfolioEconomics,
  defaultPortfolioAssumptions,
  formatCompactCurrency,
  formatCurrency,
  investmentGates,
  rankPortfolioContributors
} from "./portfolio";
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
import {
  alignmentSignals,
  architectureLanes,
  executiveAsks,
  pilotRoadmap,
  platformFitByArea
} from "./strategy";
import type { AiOpportunity, CxArea, IntakeDraft, RiskTier, SensitivityLevel, WorkflowStage } from "./types";

const cxAreas: CxArea[] = [
  "Professional Services",
  "Customer Adoption",
  "Managed Services",
  "Customer Enablement"
];

const sensitivities: SensitivityLevel[] = ["Low", "Moderate", "Sensitive", "Restricted"];
const riskFilters: Array<RiskTier | "All"> = ["All", "High", "Medium", "Low"];

type ActiveView = "Executive" | "Portfolio" | "Pilot" | "Workflow";

const workspaceViews: Array<{ id: ActiveView; label: string; summary: string }> = [
  { id: "Executive", label: "Executive", summary: "Value case" },
  { id: "Portfolio", label: "Portfolio", summary: "Intake and board" },
  { id: "Pilot", label: "Pilot", summary: "Plan and controls" },
  { id: "Workflow", label: "Workflow", summary: "Selected detail" }
];

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

function App() {
  const [opportunities, setOpportunities] = useState<AiOpportunity[]>(seedOpportunities);
  const [selectedId, setSelectedId] = useState(seedOpportunities[0].id);
  const [stageFilter, setStageFilter] = useState<WorkflowStage | "All">("All");
  const [riskFilter, setRiskFilter] = useState<RiskTier | "All">("All");
  const [draft, setDraft] = useState<IntakeDraft>(defaultDraft);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [businessCaseCopyState, setBusinessCaseCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [portfolioAssumptions, setPortfolioAssumptions] = useState(defaultPortfolioAssumptions);
  const [activeView, setActiveView] = useState<ActiveView>("Executive");

  const selected = opportunities.find((item) => item.id === selectedId) ?? opportunities[0];
  const selectedReadiness = calculateGovernanceReadiness(selected);
  const selectedBrief = buildExecutiveBrief(selected);
  const selectedGate = getNextGate(selected);
  const portfolioEconomics = useMemo(
    () => calculatePortfolioEconomics(opportunities, portfolioAssumptions),
    [opportunities, portfolioAssumptions]
  );
  const portfolioContributors = useMemo(
    () => rankPortfolioContributors(opportunities, portfolioAssumptions),
    [opportunities, portfolioAssumptions]
  );
  const portfolioBusinessCase = useMemo(
    () => buildPortfolioBusinessCase(opportunities, portfolioEconomics, portfolioContributors),
    [opportunities, portfolioContributors, portfolioEconomics]
  );
  const operatingActions = useMemo(
    () => buildOperatingActions(opportunities, portfolioAssumptions),
    [opportunities, portfolioAssumptions]
  );
  const weeklyAgenda = useMemo(
    () => buildWeeklyOperatingAgenda(opportunities, portfolioEconomics, operatingActions),
    [opportunities, operatingActions, portfolioEconomics]
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
    const highRisk = opportunities.filter((item) => item.scores.tier === "High").length;
    const released = opportunities.filter((item) => item.stage === "Released");
    const buildQueue = opportunities.filter((item) => item.stage === "Build / QA").length;
    const openApprovals = opportunities.reduce((total, item) => total + countOpenApprovals(item), 0);
    const governanceReady = opportunities.filter(
      (item) => calculateGovernanceReadiness(item) >= 70 && countOpenApprovals(item) === 0
    ).length;
    const monthlyRuns = opportunities.reduce((total, item) => total + item.workflowVolume, 0);
    const weeklyHours = opportunities.reduce((total, item) => total + item.impact.hoursSavedPerWeek, 0);
    const averagePriority =
      opportunities.reduce((total, item) => total + item.scores.priority, 0) / opportunities.length;
    const averageReadiness =
      opportunities.reduce((total, item) => total + calculateGovernanceReadiness(item), 0) / opportunities.length;

    return {
      highRisk,
      released: released.length,
      buildQueue,
      openApprovals,
      governanceReady,
      monthlyRuns,
      weeklyHours,
      averagePriority: Math.round(averagePriority),
      averageReadiness: Math.round(averageReadiness)
    };
  }, [opportunities]);

  function updateDraft<K extends keyof IntakeDraft>(field: K, value: IntakeDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updatePortfolioAssumption<K extends keyof typeof portfolioAssumptions>(
    field: K,
    value: (typeof portfolioAssumptions)[K]
  ) {
    setPortfolioAssumptions((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const opportunity = createOpportunityFromDraft(draft, opportunities.length + 1);
    setOpportunities((current) => [opportunity, ...current]);
    setSelectedId(opportunity.id);
    setCopyState("idle");
    setBusinessCaseCopyState("idle");
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
    setOpportunities((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              stage,
              auditLog: [
                {
                  timestamp: "2026-06-07 09:30",
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

  async function copySelectedBrief() {
    try {
      await navigator.clipboard.writeText(selectedBrief);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  async function copyPortfolioBusinessCase() {
    try {
      await navigator.clipboard.writeText(portfolioBusinessCase);
      setBusinessCaseCopyState("copied");
    } catch {
      setBusinessCaseCopyState("failed");
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
        <div className="header-actions" aria-label="Operating cadence">
          <span>Intake</span>
          <span>Score</span>
          <span>Build</span>
          <span>Measure</span>
        </div>
      </header>

      <section className="metric-strip" aria-label="Cadence summary">
        <Metric label="Modeled value" value={formatCompactCurrency(portfolioEconomics.annualizedValue)} suffix="/yr" tone="green" />
        <Metric label="ROI" value={portfolioEconomics.roiMultiple.toFixed(1)} suffix="x" tone="amber" />
        <Metric label="Pilot ready" value={metrics.governanceReady} suffix="items" tone="blue" />
        <Metric label="Action queue" value={operatingActions.filter((action) => action.severity !== "Watch").length} suffix="items" tone="red" />
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
          <button className="secondary-button" type="button" onClick={copyPortfolioBusinessCase}>
            {businessCaseCopyState === "copied"
              ? "Copied"
              : businessCaseCopyState === "failed"
                ? "Copy failed"
                : "Copy business case"}
          </button>
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

          <div className="assumption-panel">
            <h3>Scale assumptions</h3>
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
            <ol>
              {portfolioContributors.slice(0, 3).map((candidate) => (
                <li key={candidate.id}>
                  <span>{formatCurrency(candidate.contribution)}</span>
                  <strong>{candidate.title}</strong>
                  <p>{candidate.nextGate}</p>
                </li>
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

          <div className="action-queue-panel">
            <div className="section-title-row">
              <h3>Weekly action queue</h3>
              <span>{operatingActions.filter((action) => action.severity === "Critical").length} critical</span>
            </div>
            <ol>
              {operatingActions.slice(0, 5).map((action) => (
                <li key={action.id}>
                  <span className={`severity-pill ${action.severity.toLowerCase()}`}>{action.severity}</span>
                  <div>
                    <strong>{action.action}</strong>
                    <p>{action.workflowTitle}</p>
                    <em>
                      {action.owner} | {action.due} | {formatCurrency(action.valueAtStake)}
                    </em>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="weekly-agenda-panel">
            <h3>Weekly operating review</h3>
            <ol>
              {weeklyAgenda.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="leadership-strip" aria-label="Portfolio operating summary">
        <article>
          <span>Portfolio signal</span>
          <strong>{metrics.governanceReady} governed workflows ready for release motion</strong>
          <p>Backlog quality is judged by releaseability, not idea volume.</p>
        </article>
        <article>
          <span>Control posture</span>
          <strong>{metrics.openApprovals} human gates still open</strong>
          <p>Sensitive actions remain draft-and-review until owner approval clears.</p>
        </article>
        <article>
          <span>Current executive bet</span>
          <strong>{selected.title}</strong>
          <p>{selectedGate}</p>
        </article>
      </section>
        </>
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
                    {stageItems.map((item) => (
                      <button
                        type="button"
                        className={`opportunity-card ${item.id === selected.id ? "selected" : ""}`}
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

      {activeView === "Workflow" && (
      <section className="detail-panel" aria-labelledby="detail-title">
        <div className="detail-title-row">
          <div>
            <p className="eyebrow">{selected.cxArea}</p>
            <h2 id="detail-title">{selected.title}</h2>
            <p className="detail-subtitle">
              Governance readiness {selectedReadiness}/100. {selectedGate}.
            </p>
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
              <button className="secondary-button" type="button" onClick={copySelectedBrief}>
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
          <DetailList title="RAG / source map" items={selected.knowledgeSources.map((source) => `${source.name} | ${source.owner} | ${source.trust}`)} />
          <DetailList title="Tool and API action plan" items={selected.integrationPlan.map((step) => `${step.system}: ${step.action}. Approval: ${step.approval}`)} />
          <DetailList title="Human approval points" items={selected.approvals.map((approval) => `${approval.label} | ${approval.owner} | ${approval.status}`)} />
          <DetailList title="QA and evaluation" items={selected.qaChecklist.map((check) => `${check.label} | ${check.status}`)} />
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
    </main>
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
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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
