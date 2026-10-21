import { Role, WorkflowStage } from './index';

export type ProvenanceStatus = 
  | 'VERIFIED_SOURCE'               // Established in published AICTE APH 2024-2027
  | 'CONFIGURED_DEMO_RULE'          // Configured prototype parameter for SIH 2026 demo
  | 'PENDING_REGULATORY_VALIDATION' // Awaiting gazette publication for 2026-27 cycle
  | 'SUPERSEDED';                   // Replaced by newer amendment

export type DeadlineType = 
  | 'STATUTORY_MANDATE'          // Legally binding statutory window (e.g., 15-day SAC appeal window)
  | 'INTERNAL_SERVICE_TARGET'    // Administrative operational target (e.g., 14-day scrutiny SLA)
  | 'CONFIGURED_DEMO_DEADLINE';  // Accelerated scenario deadline for testing/demonstration

export interface RegulatoryRule {
  ruleId: string;
  clause: string;
  documentTitle: string;
  sourceReference: string;
  sourceUrl?: string;
  effectiveDate: string;
  status: ProvenanceStatus;
  deadlineType: DeadlineType;
  defaultDurationDays: number;
  description: string;
  statutoryOwnerRole: Role;
  applicableStage: WorkflowStage;
}

export interface CasePrerequisite {
  id: string;
  name: string;
  clauseReference: string;
  satisfied: boolean;
  blockerDetail?: string;
  evidenceReference?: string;
}

export interface ExplainableCaseAction {
  caseId: string;
  docketNumber: string;
  institutionName: string;
  workflowState: WorkflowStage;
  recommendedAction: string;
  actionRationale: string;
  responsibleRole: Role;
  assignedOfficer: string;
  deadlineDate: string;
  deadlineType: DeadlineType;
  deadlineCalculationExplanation: string;
  daysRemaining: number;
  isOverdue: boolean;
  prerequisites: CasePrerequisite[];
  blockers: string[];
  supportingEvidence: Array<{
    name: string;
    type: string;
    status: 'NOT_SUBMITTED' | 'PENDING_OFFICER_REVIEW' | 'VERIFIED_GENUINE' | 'RETURNED_DEFICIENT';
    notes?: string;
  }>;
  regulatorySource: {
    ruleId: string;
    clause: string;
    documentTitle: string;
    status: ProvenanceStatus;
    sourceReference: string;
  };
  permittedTransitions: Array<{
    targetStage: WorkflowStage;
    label: string;
    authorizedRoles: Role[];
    canExecute: boolean;
    blockerReason?: string;
  }>;
}

export type ConflictCheckStatus = 
  | 'CHECK_NOT_RUN'
  | 'NO_KNOWN_CONFLICT_DETECTED'
  | 'POTENTIAL_CONFLICT_REQUIRES_REVIEW'
  | 'CONFLICT_CONFIRMED'
  | 'MANUAL_REVIEW_COMPLETED';
