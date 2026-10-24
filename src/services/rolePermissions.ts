import { Role, Application, Undertaking, PrescribedDocument, NotificationLog } from '../types';
import { TabType } from '../components/Navigation';

export interface RoleConfig {
  role: Role;
  label: string;
  department: string;
  clearance: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  allowedTabs: TabType[];
  defaultTab: TabType;
  jurisdictionScope: string;
  canAdvanceWorkflow: boolean;
  canMarkRectified: boolean;
  canFlagDeficiency: boolean;
  canScheduleEVC: boolean;
  canSubmitEVCOutcome: boolean;
  canVerifyUndertakings: boolean;
  canUploadUndertakings: boolean;
  canConfirmOCR: boolean;
  canRenewDocuments: boolean;
  canTriggerCron: boolean;
  isReadOnly: boolean;
  scopeSummary: string;
  tabLabelOverrides?: Partial<Record<TabType, string>>;
}

export const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  CENTRAL_ADMIN: {
    role: 'CENTRAL_ADMIN',
    label: 'Member Secretary / Central HQ',
    department: 'AICTE Council Secretariat, New Delhi',
    clearance: 'Statutory Authority (L1)',
    badgeBg: 'bg-purple-950',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-800',
    allowedTabs: ['overview', 'workflow', 'evc', 'undertakings', 'documents', 'notifications', 'audit'],
    defaultTab: 'overview',
    jurisdictionScope: 'All 6 AICTE Regions (National Jurisdiction)',
    canAdvanceWorkflow: true,
    canMarkRectified: true,
    canFlagDeficiency: true,
    canScheduleEVC: true,
    canSubmitEVCOutcome: true,
    canVerifyUndertakings: true,
    canUploadUndertakings: true,
    canConfirmOCR: true,
    canRenewDocuments: true,
    canTriggerCron: true,
    isReadOnly: false,
    scopeSummary: 'Supreme Statutory Authority: Full administrative clearance across preliminary scrutiny, peer committee oversight, council sanctions, and cryptographic audit.',
  },
  REGIONAL_OFFICER: {
    role: 'REGIONAL_OFFICER',
    label: 'Regional Officer (RO Western/Northern)',
    department: 'Regional Office Approval Bureau',
    clearance: 'Regulatory Executive (L2)',
    badgeBg: 'bg-blue-950',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-800',
    allowedTabs: ['overview', 'workflow', 'evc', 'undertakings', 'documents', 'notifications'],
    defaultTab: 'overview',
    jurisdictionScope: 'Northern & Western Regional Jurisdictions',
    canAdvanceWorkflow: true,
    canMarkRectified: true,
    canFlagDeficiency: true,
    canScheduleEVC: true,
    canSubmitEVCOutcome: true,
    canVerifyUndertakings: true,
    canUploadUndertakings: true,
    canConfirmOCR: true,
    canRenewDocuments: true,
    canTriggerCron: true,
    isReadOnly: false,
    scopeSummary: 'Regional Regulatory Executive: Authorized to accept intake, certify scrutiny, dispatch EVC panels, verify compliance undertakings, and sign off on leases.',
  },
  SCRUTINY_OFFICER: {
    role: 'SCRUTINY_OFFICER',
    label: 'Bureau Scrutiny Desk Officer',
    department: 'Document Verification & APH Bureau',
    clearance: 'Examiner (L3)',
    badgeBg: 'bg-cyan-950',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-800',
    allowedTabs: ['overview', 'workflow', 'documents', 'notifications'],
    defaultTab: 'workflow',
    jurisdictionScope: 'Form 15 Technical Scrutiny & Form 17 Deficiency Dossiers',
    canAdvanceWorkflow: true,
    canMarkRectified: true,
    canFlagDeficiency: true,
    canScheduleEVC: false,
    canSubmitEVCOutcome: false,
    canVerifyUndertakings: false,
    canUploadUndertakings: false,
    canConfirmOCR: true,
    canRenewDocuments: false,
    canTriggerCron: false,
    isReadOnly: false,
    scopeSummary: 'Technical Document Examiner: Validates Form 15 statutory checklists, raises Form 17 deficiency notes, marks verified rectifications, and confirms assisted OCR fields.',
    tabLabelOverrides: {
      workflow: 'Scrutiny Desk & Form 15/17 Checklist',
      documents: 'Document Validity & OCR Sign-off',
    },
  },
  EVC_COORDINATOR: {
    role: 'EVC_COORDINATOR',
    label: 'Expert Visit Committee (EVC) Desk',
    department: 'Inspection & Peer Review Directorate',
    clearance: 'Panel Coordinator (L3)',
    badgeBg: 'bg-amber-950',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-800',
    allowedTabs: ['overview', 'evc', 'workflow', 'notifications'],
    defaultTab: 'evc',
    jurisdictionScope: 'Expert Committee Panels & Virtual/Physical Inspections',
    canAdvanceWorkflow: false,
    canMarkRectified: false,
    canFlagDeficiency: false,
    canScheduleEVC: true,
    canSubmitEVCOutcome: true,
    canVerifyUndertakings: false,
    canUploadUndertakings: false,
    canConfirmOCR: false,
    canRenewDocuments: false,
    canTriggerCron: false,
    isReadOnly: false,
    scopeSummary: 'Inspection Operations Desk: Runs objective conflict heuristics, constitutes peer review committees, confirms visit dates, and records official inspection findings.',
    tabLabelOverrides: {
      evc: 'EVC Panel Dispatch & Conflict Review',
      workflow: 'EVC-Queued Institutional Dockets',
    },
  },
  INSTITUTION_REP: {
    role: 'INSTITUTION_REP',
    label: 'Institutional Applicant (Principal/Registrar)',
    department: 'Technical Institution Portal',
    clearance: 'Applicant (External)',
    badgeBg: 'bg-emerald-950',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-800',
    allowedTabs: ['workflow', 'undertakings', 'documents'],
    defaultTab: 'workflow',
    jurisdictionScope: 'Apex Institute of Technology & AI (inst-01) Only',
    canAdvanceWorkflow: false,
    canMarkRectified: false, // Applicant uploads rectification evidence; Officer marks rectified
    canFlagDeficiency: false,
    canScheduleEVC: false,
    canSubmitEVCOutcome: false,
    canVerifyUndertakings: false, // Applicant submits evidence; Officer verifies compliance
    canUploadUndertakings: true,
    canConfirmOCR: false, // Officer signs off on OCR extraction
    canRenewDocuments: true,
    canTriggerCron: false,
    isReadOnly: false,
    scopeSummary: 'External Applicant Portal: Scoped strictly to your college docket. Upload compliance proofs, submit lease renewals, and view explainable case status.',
    tabLabelOverrides: {
      workflow: 'My Institutional Docket & Scrutiny',
      undertakings: 'Mandatory Undertakings (Upload Proofs)',
      documents: 'Campus Document Vault & Validity',
    },
  },
  STATUTORY_AUDITOR: {
    role: 'STATUTORY_AUDITOR',
    label: 'Central Vigilance & Statutory Auditor',
    department: 'CVC / CAG Oversight Directorate',
    clearance: 'Read-Only Cryptographic Audit',
    badgeBg: 'bg-rose-950',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-800',
    allowedTabs: ['audit', 'overview', 'workflow'],
    defaultTab: 'audit',
    jurisdictionScope: 'National Oversight & Cryptographic Immutable Ledger',
    canAdvanceWorkflow: false,
    canMarkRectified: false,
    canFlagDeficiency: false,
    canScheduleEVC: false,
    canSubmitEVCOutcome: false,
    canVerifyUndertakings: false,
    canUploadUndertakings: false,
    canConfirmOCR: false,
    canRenewDocuments: false,
    canTriggerCron: false,
    isReadOnly: true,
    scopeSummary: 'Independent Vigilance Oversight (CVC/CAG): Inspects immutable SHA-256 hash chains, detects tampering, and monitors national SLA pendency. All data mutations are locked in read-only mode.',
    tabLabelOverrides: {
      audit: 'Cryptographic Audit Vault (Live Hash Chain)',
      overview: 'Vigilance & SLA Pendency Audit',
      workflow: 'Read-Only Application Audit Trail',
    },
  },
};

export function isTabAllowed(role: Role, tab: TabType): boolean {
  return ROLE_CONFIGS[role]?.allowedTabs.includes(tab) ?? true;
}

export function filterApplicationsForRole(apps: Application[], role: Role): Application[] {
  if (role === 'INSTITUTION_REP') {
    // Only show the applicant's institution (Apex Institute of Technology & AI / inst-01)
    return apps.filter(a => a.id === 'app-01' || a.institutionCode === '1-10942871');
  }
  if (role === 'REGIONAL_OFFICER') {
    // RO Northern + Western scope
    return apps.filter(a => a.region === 'Northern' || a.region === 'Western');
  }
  if (role === 'EVC_COORDINATOR') {
    // EVC queue and inspection-related dockets
    return apps.filter(a => 
      a.currentStage === 'EVC_QUEUED' || 
      a.currentStage === 'EVC_SCHEDULED' || 
      a.currentStage === 'EVC_COMPLETED' ||
      a.route !== 'ROUTE_EOA'
    );
  }
  return apps;
}

export function filterUndertakingsForRole(unds: Undertaking[], role: Role): Undertaking[] {
  if (role === 'INSTITUTION_REP') {
    return unds.filter(u => u.applicationId === 'app-01');
  }
  return unds;
}

export function filterDocumentsForRole(docs: PrescribedDocument[], role: Role): PrescribedDocument[] {
  if (role === 'INSTITUTION_REP') {
    return docs.filter(d => d.institutionCode === '1-10942871' || d.id === 'doc-01');
  }
  return docs;
}

export function filterNotificationsForRole(notifs: NotificationLog[], role: Role): NotificationLog[] {
  if (role === 'INSTITUTION_REP') {
    return notifs.filter(n => n.recipientRole === 'INSTITUTION_REP');
  }
  if (role === 'SCRUTINY_OFFICER') {
    return notifs.filter(n => n.recipientRole === 'SCRUTINY_OFFICER' || n.recipientRole === 'REGIONAL_OFFICER');
  }
  if (role === 'EVC_COORDINATOR') {
    return notifs.filter(n => n.recipientRole === 'EVC_COORDINATOR');
  }
  return notifs;
}
