import { FormEvent, useMemo, useState } from "react";
import { createOpportunityFromDraft, seedOpportunities, STAGES } from "./data";
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
import type { AiOpportunity, CxArea, IntakeDraft, RiskTier, SensitivityLevel, WorkflowStage } from "./types";

const cxAreas: CxArea[] = [
  "Professional Services",
  "Customer Adoption",
  "Managed Services",
  "Customer Enablement"
];

const sensitivities: SensitivityLevel[] = ["Low", "Moderate", "Sensitive", "Restricted"];
const riskFilters: Array<RiskTier | "All"> = ["All", "High", "Medium", "Low"];

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

  const selected = opportunities.find((item) => item.id === selectedId) ?? opportunities[0];
  const selectedReadiness = calculateGovernanceReadiness(selected);
  const selectedBrief = buildExecutiveBrief(selected);
  const selectedGate = getNextGate(selected);

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
      weeklyHours,
      averagePriority: Math.round(averagePriority),
      averageReadiness: Math.round(averageReadiness)
    };
  }, [opportunities]);

  function updateDraft<K extends keyof IntakeDraft>(field: K, value: IntakeDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const opportunity = createOpportunityFromDraft(draft, opportunities.length + 1);
    setOpportunities((current) => [opportunity, ...current]);
    setSelectedId(opportunity.id);
    setCopyState("idle");
    setStageFilter("All");
    setRiskFilter("All");
  }

  function selectOpportunity(id: string) {
    setSelectedId(id);
    setCopyState("idle");
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

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Vena Solutions role prototype</p>
          <h1>CX AI Operating Cadence Board</h1>
          <p className="header-subtitle">
            Business-facing AI transformation across services, adoption, managed services, and enablement.
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
        <Metric label="Avg priority" value={metrics.averagePriority} suffix="/100" tone="green" />
        <Metric label="Gov ready" value={metrics.governanceReady} suffix="items" tone="blue" />
        <Metric label="Avg readiness" value={metrics.averageReadiness} suffix="/100" tone="gray" />
        <Metric label="Build / QA" value={metrics.buildQueue} suffix="items" tone="blue" />
        <Metric label="Open approvals" value={metrics.openApprovals} suffix="gates" tone="red" />
        <Metric label="Impact" value={metrics.weeklyHours} suffix="hrs/wk" tone="amber" />
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
    </main>
  );
}

function Slider({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-field">
      <span>
        {label}
        <strong>{value}</strong>
      </span>
      <input type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} />
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
  value: number;
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
