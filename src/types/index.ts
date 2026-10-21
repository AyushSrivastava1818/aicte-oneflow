export type Role = 
  | 'CENTRAL_ADMIN' 
  | 'REGIONAL_OFFICER' 
  | 'SCRUTINY_OFFICER' 
  | 'EVC_COORDINATOR' 
  | 'INSTITUTION_REP' 
  | 'STATUTORY_AUDITOR';

export type ApplicationRoute = 
  | 'ROUTE_EOA' // Extension of Approval (Only Scrutiny + Undertakings)
  | 'ROUTE_NEW_INSTITUTION' // New Institution (Scrutiny + EVC + SAC + Council)
  | 'ROUTE_INCREASE_INTAKE' // Increase in Intake / New Course (Scrutiny + EVC)
  | 'ROUTE_CLOSURE_RESTORATION'; // Closure or Restoration of intake

export type WorkflowStage = 
  | 'APPLICATION_SUBMITTED'
  | 'UNDER_SCRUTINY'
  | 'SCRUTINY_DEFICIENCY_RAISED'
  | 'RE_SCRUTINY'
  | 'SCRUTINY_CLEARED'
  | 'EVC_QUEUED'
  | 'EVC_SCHEDULED'
  | 'EVC_COMPLETED'
  | 'SAC_SHC_REVIEW'
  | 'COUNCIL_DECISION_PENDING'
  | 'APPROVED_WITH_UNDERTAKINGS'
  | 'APPROVED_UNCONDITIONAL'
  | 'REJECTED';

export type DeficiencySeverity = 'CRITICAL' | 'MODERATE' | 'MINOR';

export interface Deficiency {
  id: string;
  clause: string;
  description: string;
  severity: DeficiencySeverity;
  raisedBy: string;
  raisedAt: string;
  resolved: boolean;
  resolutionNote?: string;
}

export interface Application {
  id: string;
  docketNumber: string;
  institutionName: string;
  institutionCode: string;
  region: 'Northern' | 'Western' | 'Southern' | 'South-Western' | 'Eastern' | 'Central';
  state: string;
  academicYear: string;
  applicationType: 'New Technical Institution' | 'Extension of Approval (EoA)' | 'Increase in Intake' | 'Course Addition';
  route: ApplicationRoute;
  currentStage: WorkflowStage;
  ruleVersion: string; // e.g. "APH-2026-27-v1.4"
  submittedAt: string;
  slaDeadline: string; // Statutory timeline
  assignedOfficer: string;
  assignedRole: Role;
  deficiencies: Deficiency[];
  landAreaAcres: number;
  carpetAreaSqM: number;
  cadreRatio: string;
  trustDeedValid: boolean;
  fireNocValid: boolean;
  buildingPlanValid: boolean;
  hasPendingUndertakings: boolean;
  lastAction: string;
  lastActionTimestamp: string;
}

export interface EVCRecord {
  id: string;
  applicationId: string;
  docketNumber: string;
  institutionName: string;
  region: string;
  scheduledDate: string | null;
  coordinatorName: string;
  committeeExperts: Array<{
    name: string;
    designation: string;
    institution: string;
    state: string;
    specialization: string;
  }>;
  conflictCheckPassed: boolean;
  readinessChecks: {
    facultyRosterSubmitted: boolean;
    landGeoCoordsVerified: boolean;
    buildingCompletionCertUploaded: boolean;
    fireSafetyNocValid: boolean;
  };
  status: 'PENDING_SCHEDULE' | 'SCHEDULED' | 'VISIT_IN_PROGRESS' | 'REPORT_SUBMITTED' | 'CLOSED';
  recommendation?: 'RECOMMENDED_FULL' | 'RECOMMENDED_WITH_CONDITIONS' | 'REJECTED_DEFICIENT';
  remarks?: string;
  geoLatitude?: number;
  geoLongitude?: number;
}

export interface Undertaking {
  id: string;
  applicationId: string;
  docketNumber: string;
  institutionName: string;
  title: string;
  statutoryCondition: string;
  aphClause: string;
  issuedDate: string;
  dueDate: string;
  status: 'PENDING_SUBMISSION' | 'SUBMITTED_UNDER_REVIEW' | 'RETURNED_FOR_CORRECTION' | 'VERIFIED_COMPLIANT' | 'OVERDUE_ESCALATED';
  evidenceDocName?: string;
  evidenceDocSize?: string;
  submittedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  escalationLevel: number; // 0: Normal, 1: RO Warning, 2: Member Secretary Notice
}

export interface PrescribedDocument {
  id: string;
  institutionName: string;
  institutionCode: string;
  docType: 'Land Lease Deed' | 'Fire Safety NOC' | 'Building Safety Certificate' | 'AICTE Trust Registration' | 'Affiliating University NOC';
  documentNumber: string;
  issuedByAuthority: string;
  issueDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'VALID' | 'EXPIRING_SOON' | 'CRITICALLY_EXPIRED' | 'RENEWAL_SUBMITTED' | 'RENEWAL_VERIFIED';
  ocrExtraction: {
    extractedDocType: string;
    extractedExpiryDate: string;
    extractedLessor: string;
    extractedPlotSurveyNo: string;
    confidenceScore: number;
    humanConfirmed: boolean;
  };
  fileSize: string;
  lastRenewedDate?: string;
}

export interface NotificationLog {
  id: string;
  docketNumber: string;
  recipientRole: Role;
  recipientEmail: string;
  subject: string;
  bodyPreview: string;
  channel: 'OFFICIAL_PORTAL_ALERT' | 'GOV_SMS_GATEWAY' | 'NIC_EMAIL';
  timestamp: string;
  status: 'DELIVERED' | 'ACKNOWLEDGED' | 'ESCALATED';
  escalationLevel: 'DESK_OFFICER' | 'REGIONAL_DIRECTOR' | 'MEMBER_SECRETARY';
  idempotencyKey: string;
}

export interface CryptographicAuditRecord {
  id: string;
  blockHeight: number;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  actionType: string;
  docketNumber: string;
  previousStage: string;
  newStage: string;
  ruleVersion: string;
  reasonOrObservations: string;
  ipAddress: string;
  previousHash: string;
  currentHash: string;
}

export interface NextBestAction {
  stage: string;
  actionTitle: string;
  responsibleRole: Role;
  statutoryDeadline: string;
  daysRemaining: number;
  isOverdue: boolean;
  blockingReasons: string[];
  canExecute: boolean;
  escalationNotice?: string;
}
