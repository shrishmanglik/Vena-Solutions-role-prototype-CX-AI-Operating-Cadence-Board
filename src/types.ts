export type CxArea =
  | "Professional Services"
  | "Customer Adoption"
  | "Managed Services"
  | "Customer Enablement";

export type WorkflowStage = "Intake" | "Scored" | "Build / QA" | "Released";

export type SensitivityLevel = "Low" | "Moderate" | "Sensitive" | "Restricted";

export type RiskTier = "Low" | "Medium" | "High";

export type CheckStatus = "Not started" | "In review" | "Passed" | "Blocked";

export type ApprovalStatus = "Required" | "Ready" | "Approved";

export interface KnowledgeSource {
  name: string;
  owner: string;
  trust: "High" | "Medium" | "Needs review";
}

export interface IntegrationStep {
  system: string;
  action: string;
  approval: string;
}

export interface QualityCheck {
  label: string;
  status: CheckStatus;
}

export interface GovernanceApproval {
  label: string;
  owner: string;
  status: ApprovalStatus;
}

export interface ImpactEstimate {
  hoursSavedPerWeek: number;
  timeToValueDays: number;
  adoptionReadiness: number;
  dataQualityLift: number;
}

export interface AuditEvent {
  timestamp: string;
  actor: string;
  event: string;
}

export interface OpportunityScores {
  value: number;
  feasibility: number;
  risk: number;
  strategicAlignment: number;
  urgency: number;
  priority: number;
  tier: RiskTier;
}

export interface AiOpportunity {
  id: string;
  title: string;
  cxArea: CxArea;
  owner: string;
  stage: WorkflowStage;
  painPoint: string;
  workflowVolume: number;
  sensitivity: SensitivityLevel;
  scores: OpportunityScores;
  knowledgeSources: KnowledgeSource[];
  integrationPlan: IntegrationStep[];
  approvals: GovernanceApproval[];
  qaChecklist: QualityCheck[];
  releaseNotes: string[];
  adoptionPlaybook: string[];
  impact: ImpactEstimate;
  auditLog: AuditEvent[];
}

export interface IntakeDraft {
  title: string;
  cxArea: CxArea;
  owner: string;
  painPoint: string;
  workflowVolume: number;
  value: number;
  feasibility: number;
  risk: number;
  strategicAlignment: number;
  urgency: number;
  sensitivity: SensitivityLevel;
  sensitiveActionApproval: boolean;
}
