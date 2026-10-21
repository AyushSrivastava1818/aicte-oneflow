import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../db/database';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { appendAuditEvent } from '../services/auditService';

export const applicationsRouter = Router();

interface ApplicationRow {
  id: string;
  docket_number: string;
  institution_id: string;
  institution_name: string;
  institution_code: string;
  region: string;
  state: string;
  academic_year: string;
  application_type: string;
  route: string;
  current_stage: string;
  rule_version: string;
  rule_provenance: string;
  submitted_at: string;
  sla_deadline: string;
  deadline_type: string;
  deadline_calculation_basis: string;
  assigned_officer: string;
  assigned_role: string;
  land_area_acres: number;
  carpet_area_sqm: number;
  cadre_ratio: string;
  trust_deed_valid: number;
  fire_noc_valid: number;
  building_plan_valid: number;
  has_pending_undertakings: number;
  last_action: string;
  last_action_timestamp: string;
}

interface DeficiencyRow {
  id: string;
  application_id: string;
  clause: string;
  description: string;
  severity: string;
  raised_by: string;
  raised_at: string;
  resolved: number;
  resolution_note: string | null;
}

// Authoritative Explainable Next Action Domain Model
export interface AuthoritativeCaseAction {
  actionId: string;
  applicationId: string;
  docketNumber: string;
  actionTitle: string;
  nextAction: string; // compatibility alias
  whyRequired: string;
  why: string; // compatibility alias
  category: 'REGULATORY_SCRUTINY' | 'DEFICIENCY_REMEDIATION' | 'EVC_INSPECTION' | 'APPELLATE_REVIEW' | 'COUNCIL_SANCTION' | 'POST_APPROVAL_MONITORING' | 'EXCEPTION_QUEUE';
  status: 'ACTIONABLE' | 'BLOCKED' | 'WAITING_EXTERNAL' | 'COMPLETED' | 'TERMINAL_APPEAL' | 'DIAGNOSTIC_EXCEPTION';
  responsibleRole: string;
  assignedOfficer: string;
  dueDateTime: string;
  deadline: string; // compatibility alias
  deadlineType: string;
  deadlineCalculationBasis: string;
  ruleReference: string;
  ruleSource: string; // compatibility alias
  sourceDocument: string;
  sectionClause: string;
  ruleVersion: string;
  ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION' | 'CONFIGURED_DEMO_RULE' | 'UNVERIFIED_HUMAN_REVIEW_REQUIRED';
  prerequisites: Array<{
    id: string;
    name: string;
    clauseReference: string;
    satisfied: boolean;
    blockerDetail?: string;
  }>;
  missingPrerequisites: string[];
  blockingConditions: string[];
  evidenceRequired: string[];
  evidenceSubmitted: Array<{
    name: string;
    type: string;
    status: 'VERIFIED_GENUINE' | 'PENDING_OFFICER_REVIEW' | 'RETURNED_DEFICIENT';
    notes?: string;
  }>;
  permittedNextStages: string[];
  generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY';
  availabilityRationale: string;
  completionImpact: string;
}

// Compute Explainable Next Action Ledger server-side
function calculateNextAction(app: ApplicationRow, deficiencies: DeficiencyRow[]): AuthoritativeCaseAction {
  const unresolvedDeficiencies = deficiencies.filter((d) => d.resolved === 0);

  // Common statutory prerequisites
  const basePrereqs = [
    {
      id: 'prereq-trust-deed',
      name: 'Registered Trust / Society Deed Validity',
      clauseReference: 'APH Chapter I, Clause 1.4(a)',
      satisfied: app.trust_deed_valid === 1,
      blockerDetail: app.trust_deed_valid === 1 ? undefined : 'Trust/Society registration deed renewal or certification is pending.',
    },
    {
      id: 'prereq-fire-noc',
      name: 'State Fire Services Final NOC',
      clauseReference: 'APH Chapter IV, Clause 4.12(b)',
      satisfied: app.fire_noc_valid === 1,
      blockerDetail: app.fire_noc_valid === 1 ? undefined : 'Fire & Life Safety NOC missing or issued under provisional municipal authority.',
    },
    {
      id: 'prereq-building-plan',
      name: 'Municipal Approved Building & Occupancy Plan',
      clauseReference: 'APH Chapter III, Clause 3.8',
      satisfied: app.building_plan_valid === 1,
      blockerDetail: app.building_plan_valid === 1 ? undefined : 'Sanctioned architectural building plan or occupancy certificate pending.',
    },
    {
      id: 'prereq-scrutiny-deficiencies',
      name: 'Zero Critical Deficiencies on Observation Checklist',
      clauseReference: 'APH Chapter II, Clause 2.3 & Form 15',
      satisfied: unresolvedDeficiencies.length === 0,
      blockerDetail: unresolvedDeficiencies.length > 0 ? `${unresolvedDeficiencies.length} unresolved deficiency(ies) require institutional rectification.` : undefined,
    },
  ];

  const activeBlockers = basePrereqs.filter((p) => !p.satisfied && p.blockerDetail).map((p) => p.blockerDetail!);

  const baseEvidence = [
    {
      name: 'Registered 30-Year Land Lease / Sale Deed',
      type: 'Land & Building Title',
      status: (app.trust_deed_valid === 1 ? 'VERIFIED_GENUINE' : 'PENDING_OFFICER_REVIEW') as any,
      notes: app.trust_deed_valid === 1 ? 'Verified against state land registry.' : 'Awaiting sub-registrar authentication.',
    },
    {
      name: 'State Fire Services Certificate',
      type: 'Life & Fire Safety',
      status: (app.fire_noc_valid === 1 ? 'VERIFIED_GENUINE' : 'RETURNED_DEFICIENT') as any,
      notes: app.fire_noc_valid === 1 ? 'Compliant with National Building Code Part IV.' : 'Provisional NOC rejected. Final certificate required.',
    },
    {
      name: 'Approved Structural Soundness & Occupancy Plan',
      type: 'Civil Infrastructure',
      status: (app.building_plan_valid === 1 ? 'VERIFIED_GENUINE' : 'PENDING_OFFICER_REVIEW') as any,
    },
  ];

  const actionId = `ACT-${app.docket_number}-${app.current_stage}`;

  switch (app.current_stage) {
    case 'SUBMITTED':
    case 'APPLICATION_SUBMITTED':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Assign Bureau Scrutiny Officer & Verify Initial Docket Uploads',
        nextAction: 'Assign Bureau Scrutiny Officer & Verify Initial Docket Uploads',
        whyRequired: 'New docket registered in portal. Form 15 preliminary scrutiny must be initiated to verify statutory uploads against APH norms.',
        why: 'Docket submitted by institution requires formal verification of land deeds, fire NOC, and building approval against APH norms.',
        category: 'REGULATORY_SCRUTINY',
        status: 'ACTIONABLE',
        responsibleRole: 'REGIONAL_OFFICER',
        assignedOfficer: app.assigned_officer || 'Regional Director / Desk Officer',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: app.deadline_type || 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: app.deadline_calculation_basis || '14 calendar days from docket intake under APH Clause 2.3.1',
        ruleReference: 'RULE-APH-SCRUTINY-01',
        ruleSource: 'RULE-APH-SCRUTINY-01 (APH Ch. II, Cl. 2.3.1)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.3.1',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: [],
        blockingConditions: [],
        evidenceRequired: ['Registered 30-Year Land Lease / Title Deed', 'State Fire Safety Final NOC', 'Approved Architectural Building Plan'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['UNDER_SCRUTINY', 'SCRUTINY_DEFICIENCY_RAISED'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Initial intake completed. Docket is ready for desk assignment.',
        completionImpact: 'Transitions docket to active Technical Scrutiny (Form 15 checklist verification).',
      };

    case 'UNDER_SCRUTINY':
      if (unresolvedDeficiencies.length > 0) {
        return {
          actionId,
          applicationId: app.id,
          docketNumber: app.docket_number,
          actionTitle: 'Issue Formal Form 17 Deficiency Memorandum',
          nextAction: 'Issue Formal Form 17 Deficiency Memo',
          whyRequired: `Scrutiny Committee flagged ${unresolvedDeficiencies.length} statutory deficiency(ies). Application must be returned for institutional cure.`,
          why: `Scrutiny Committee flagged ${unresolvedDeficiencies.length} statutory deficiency(ies). Application must be returned for institutional cure.`,
          category: 'DEFICIENCY_REMEDIATION',
          status: 'BLOCKED',
          responsibleRole: 'SCRUTINY_OFFICER',
          assignedOfficer: app.assigned_officer,
          dueDateTime: app.sla_deadline,
          deadline: app.sla_deadline,
          deadlineType: 'STATUTORY_MANDATE',
          deadlineCalculationBasis: '10 calendar days rectification window as per APH Clause 2.4(a)',
          ruleReference: 'RULE-APH-DEFICIENCY-02',
          ruleSource: 'RULE-APH-DEFICIENCY-02 (APH Ch. II, Cl. 2.4(a))',
          sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
          sectionClause: 'Chapter II, Clause 2.4(a)',
          ruleVersion: app.rule_version,
          ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
          prerequisites: basePrereqs,
          missingPrerequisites: unresolvedDeficiencies.map((d) => `${d.clause}: ${d.description}`),
          blockingConditions: activeBlockers,
          evidenceRequired: unresolvedDeficiencies.map((d) => `Rectification proof for ${d.clause}`),
          evidenceSubmitted: baseEvidence,
          permittedNextStages: ['SCRUTINY_DEFICIENCY_RAISED'],
          generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
          availabilityRationale: 'Open deficiencies prevent certification of scrutiny clearance.',
          completionImpact: 'Issues Form 17 memorandum to institution and opens statutory 10-day rectification window.',
        };
      }
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Certify Scrutiny Cleared (Checklist Form 15 Sign-off)',
        nextAction: 'Recommend Clearance to Regional Committee',
        whyRequired: 'All statutory title deeds, fire NOCs, and cadral ratios comply with Approval Process Handbook requirements without active deficiencies.',
        why: 'All statutory title deeds, NOCs, and cadral ratios comply with Approval Process Handbook requirements without active deficiencies.',
        category: 'REGULATORY_SCRUTINY',
        status: activeBlockers.length > 0 ? 'BLOCKED' : 'ACTIONABLE',
        responsibleRole: 'SCRUTINY_OFFICER',
        assignedOfficer: app.assigned_officer,
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: '14 calendar days from docket intake under APH Clause 2.3.1',
        ruleReference: 'RULE-APH-SCRUTINY-01',
        ruleSource: 'RULE-APH-SCRUTINY-01 (APH Ch. II, Cl. 2.3.1)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.3.1',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: activeBlockers,
        blockingConditions: activeBlockers,
        evidenceRequired: ['Form 15 Scrutiny Checklist Sign-off'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['SCRUTINY_CLEARED', 'SCRUTINY_DEFICIENCY_RAISED'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: activeBlockers.length === 0 ? 'All statutory checks satisfied with zero open deficiencies.' : 'Blocked by statutory prerequisite deficits.',
        completionImpact: 'Clears scrutiny phase; advances docket to EVC scheduling or direct approval (EoA route).',
      };

    case 'SCRUTINY_DEFICIENCY_RAISED':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Institution to Submit Clarifications & Rectification Evidence',
        nextAction: 'Upload Rectification Evidence & Supporting Documents',
        whyRequired: 'Institution representative must submit rectified documentation for pointed deficiencies before statutory 10-day window expires.',
        why: 'Institution representative must submit rectified documentation for pointed deficiencies before the statutory 10-day window expires.',
        category: 'DEFICIENCY_REMEDIATION',
        status: 'WAITING_EXTERNAL',
        responsibleRole: 'INSTITUTION_REP',
        assignedOfficer: 'Institution Nodal Officer / Registrar',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'STATUTORY_MANDATE',
        deadlineCalculationBasis: 'Statutory 10 calendar days curing window (APH Cl. 2.4)',
        ruleReference: 'RULE-APH-DEFICIENCY-02',
        ruleSource: 'RULE-APH-DEFICIENCY-02 (APH Ch. II, Cl. 2.4(a))',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.4(a)',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: unresolvedDeficiencies.map((d) => `Awaiting institutional rectification: ${d.description}`),
        blockingConditions: ['Pending institutional upload of compliant certificates'],
        evidenceRequired: unresolvedDeficiencies.map((d) => `Rectification proof for ${d.clause}`),
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['UNDER_SCRUTINY', 'RE_SCRUTINY'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Statutory 10-day cure window active for applicant institution.',
        completionImpact: 'Resubmits cured evidence to Scrutiny Committee for Re-Scrutiny verification.',
      };

    case 'RE_SCRUTINY':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Evaluate Resubmitted Rectifications & Close Observation Checklist',
        nextAction: 'Evaluate Resubmitted Rectifications & Close Observation Checklist',
        whyRequired: 'Institution submitted rectification documents. Scrutiny Committee must re-evaluate compliance before cleared sign-off.',
        why: 'Institution submitted rectification documents. Scrutiny Committee must re-evaluate compliance before cleared sign-off.',
        category: 'REGULATORY_SCRUTINY',
        status: 'ACTIONABLE',
        responsibleRole: 'SCRUTINY_OFFICER',
        assignedOfficer: app.assigned_officer,
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: '7 calendar days re-scrutiny disposal window',
        ruleReference: 'RULE-APH-SCRUTINY-01',
        ruleSource: 'RULE-APH-SCRUTINY-01 (APH Ch. II, Cl. 2.3.1)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.3.1',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: activeBlockers,
        blockingConditions: activeBlockers,
        evidenceRequired: ['Rectified certificates verification'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['SCRUTINY_CLEARED', 'SCRUTINY_DEFICIENCY_RAISED'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Institution has uploaded rectifications for re-scrutiny.',
        completionImpact: 'Closes Form 17 observations and certifies scrutiny clearance.',
      };

    case 'SCRUTINY_CLEARED':
      if (app.route === 'ROUTE_EOA') {
        return {
          actionId,
          applicationId: app.id,
          docketNumber: app.docket_number,
          actionTitle: 'Issue Extension of Approval (EoA) Order with Undertaking Register',
          nextAction: 'Sanction Extension of Approval (EoA)',
          whyRequired: 'Scrutiny cleared for Extension of Approval. Regional Officer authorized to grant EoA subject to routine undertakings.',
          why: 'Scrutiny cleared for Extension of Approval. Regional Officer authorized to grant EoA subject to routine undertakings.',
          category: 'COUNCIL_SANCTION',
          status: 'ACTIONABLE',
          responsibleRole: 'REGIONAL_OFFICER',
          assignedOfficer: 'Regional Director',
          dueDateTime: app.sla_deadline,
          deadline: app.sla_deadline,
          deadlineType: 'INTERNAL_SERVICE_TARGET',
          deadlineCalculationBasis: '7 calendar days from scrutiny clearance',
          ruleReference: 'RULE-APH-UNDERTAKINGS-05',
          ruleSource: 'RULE-APH-UNDERTAKINGS-05 (APH Ch. I, Cl. 1.4(g))',
          sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
          sectionClause: 'Chapter I, Clause 1.4(g)',
          ruleVersion: app.rule_version,
          ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
          prerequisites: basePrereqs,
          missingPrerequisites: [],
          blockingConditions: [],
          evidenceRequired: ['Signed Form 15 Scrutiny Clearance Certificate'],
          evidenceSubmitted: baseEvidence,
          permittedNextStages: ['APPROVED_WITH_UNDERTAKINGS', 'APPROVED'],
          generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
          availabilityRationale: 'EoA route does not require physical EVC inspection.',
          completionImpact: 'Emits conditional Extension of Approval (EoA) order.',
        };
      }
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Queue for Expert Visit Committee (EVC) Panel Dispatch',
        nextAction: 'Dispatch Expert Visit Committee (EVC) or Advance to EC Review',
        whyRequired: 'Document scrutiny passed for New Institution / Intake Increase. Route requires peer committee physical or virtual inspection.',
        why: 'Document scrutiny successfully passed. Regional Committee must either schedule physical/virtual EVC or submit direct recommendations to Executive Committee.',
        category: 'EVC_INSPECTION',
        status: 'ACTIONABLE',
        responsibleRole: 'REGIONAL_OFFICER',
        assignedOfficer: 'Regional Officer / EVC Desk',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: '10 days allocation buffer following scrutiny clearance',
        ruleReference: 'RULE-APH-EVC-03',
        ruleSource: 'RULE-APH-EVC-03 (APH Ch. II, Cl. 2.5)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.5',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: [],
        blockingConditions: [],
        evidenceRequired: ['Pre-inspection readiness checklist confirmation'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['EVC_QUEUED', 'RECOMMENDED_TO_EC'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Scrutiny cleared. Ready for EVC dispatch.',
        completionImpact: 'Transfers case to EVC Coordinator queue for panel selection.',
      };

    case 'EVC_QUEUED':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Constitute Conflict-Free Peer Committee & Schedule Inspection',
        nextAction: 'Conduct Multi-Expert Inspection & Submit Objective Evaluation Report',
        whyRequired: 'Docket awaiting panel constitution under APH Clause 2.5. Coordinator must evaluate conflict status and readiness checks prior to confirmation.',
        why: 'EVC committee constituted. Experts must conduct physical or virtual verification of infrastructure, labs, and faculty presence.',
        category: 'EVC_INSPECTION',
        status: 'ACTIONABLE',
        responsibleRole: 'EVC_COORDINATOR',
        assignedOfficer: 'EVC Desk Coordinator',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: '10 calendar days inspection target window',
        ruleReference: 'RULE-APH-EVC-03',
        ruleSource: 'RULE-APH-EVC-03 (APH Ch. II, Cl. 2.5)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.5',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: [],
        blockingConditions: [],
        evidenceRequired: ['Panel expert conflict declarations', 'Readiness checklist (4/4)'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['EVC_SCHEDULED', 'RECOMMENDED_TO_EC', 'REJECTED_DEFICIENCY'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Awaiting expert committee constitution and date fixing.',
        completionImpact: 'Locks inspection date and notifies empanelled experts and applicant.',
      };

    case 'EVC_SCHEDULED':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Conduct Multi-Expert Inspection & Upload Inspection Matrix',
        nextAction: 'Conduct Multi-Expert Inspection & Upload Inspection Matrix',
        whyRequired: 'Inspection date confirmed. Peer committee to conduct physical/virtual inspection and log outcome recommendations.',
        why: 'Inspection date confirmed. Peer committee to conduct physical/virtual inspection and log outcome recommendations.',
        category: 'EVC_INSPECTION',
        status: 'ACTIONABLE',
        responsibleRole: 'EVC_COORDINATOR',
        assignedOfficer: 'EVC Desk Coordinator',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: 'Report due within 24 hours of inspection completion',
        ruleReference: 'RULE-APH-EVC-03',
        ruleSource: 'RULE-APH-EVC-03 (APH Ch. II, Cl. 2.5)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.5',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: [],
        blockingConditions: [],
        evidenceRequired: ['Geotagged campus photo matrix', 'Signed expert evaluation report'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['EVC_COMPLETED', 'RECOMMENDED_TO_EC', 'REJECTED_DEFICIENCY'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Site inspection date confirmed.',
        completionImpact: 'Records committee findings and advances docket to Council decision.',
      };

    case 'EVC_COMPLETED':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Forward EVC Outcome to Executive Committee for Approval Sanction',
        nextAction: 'Forward EVC Outcome to Executive Committee for Approval Sanction',
        whyRequired: 'Inspection completed and report received. Case submitted for statutory council sanction.',
        why: 'Inspection completed and report received. Case submitted for statutory council sanction.',
        category: 'COUNCIL_SANCTION',
        status: 'ACTIONABLE',
        responsibleRole: 'REGIONAL_OFFICER',
        assignedOfficer: 'Regional Director',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: '5 calendar days dispatch buffer',
        ruleReference: 'RULE-APH-SCRUTINY-01',
        ruleSource: 'RULE-APH-SCRUTINY-01 (APH Ch. II, Cl. 2.7)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.7',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: [],
        blockingConditions: [],
        evidenceRequired: ['EVC final recommendation dossier'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['RECOMMENDED_TO_EC', 'APPROVED_WITH_UNDERTAKINGS', 'APPROVED'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Committee report signed and uploaded.',
        completionImpact: 'Places docket before AICTE Executive Committee for approval determination.',
      };

    case 'RECOMMENDED_TO_EC':
    case 'COUNCIL_DECISION_PENDING':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Executive Committee Statutory Approval Determination',
        nextAction: 'Executive Committee Statutory Approval Determination',
        whyRequired: 'Scrutiny and EVC clearance completed. Final statutory grant of Approval (LoA/EoA) or Rejection by Executive Committee.',
        why: 'Scrutiny and EVC clearance completed. Final statutory grant of Approval (LoA/EoA) or Rejection by Executive Committee.',
        category: 'COUNCIL_SANCTION',
        status: 'ACTIONABLE',
        responsibleRole: 'CENTRAL_ADMIN',
        assignedOfficer: 'AICTE Executive Committee / Member Secretary',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'STATUTORY_MANDATE',
        deadlineCalculationBasis: 'APH statutory final determination timeline (APH Clause 2.7)',
        ruleReference: 'RULE-APH-SAC-APPEAL-04',
        ruleSource: 'RULE-APH-SAC-APPEAL-04 (APH Ch. II, Cl. 2.7)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.7',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: [],
        blockingConditions: [],
        evidenceRequired: ['Executive Committee resolution sign-off'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['APPROVED', 'APPROVED_WITH_UNDERTAKINGS', 'REJECTED_DEFICIENCY', 'SAC_SHC_REVIEW'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Scrutiny and inspection clearances complete. Awaiting council determination.',
        completionImpact: 'Generates official Letter of Approval (LoA) or speaking rejection order.',
      };

    case 'APPROVED_WITH_UNDERTAKINGS':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Monitor Active Time-Bound Undertakings & Lease Expiry Radar',
        nextAction: 'Monitor Post-Approval Compliance & Renewal Radars',
        whyRequired: 'Statutory approval issued subject to post-approval obligations under APH Clause 1.4(g) & 7.4. Surveillance radar active.',
        why: 'Statutory approval issued. Continuous tracking of land lease, building stability, fire NOC, and cadre compliance undertakings is now active.',
        category: 'POST_APPROVAL_MONITORING',
        status: 'COMPLETED',
        responsibleRole: 'REGIONAL_OFFICER',
        assignedOfficer: 'Compliance Bureau Desk',
        dueDateTime: app.sla_deadline,
        deadline: 'Active Monitoring Cycle',
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: 'Continuous compliance tracking under Chapter VII',
        ruleReference: 'RULE-APH-UNDERTAKINGS-05',
        ruleSource: 'RULE-APH-UNDERTAKINGS-05 (APH Ch. VII, Cl. 7.1)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter VII, Clause 7.1',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: [
          ...basePrereqs,
          {
            id: 'prereq-undertakings-fulfilled',
            name: 'Time-Bound Compliance Undertakings Certified',
            clauseReference: 'APH Chapter I, Clause 1.4(g) & 7.4',
            satisfied: app.has_pending_undertakings === 0,
            blockerDetail: app.has_pending_undertakings === 1 ? 'Active post-approval undertakings under statutory monitoring window.' : undefined,
          },
        ],
        missingPrerequisites: [],
        blockingConditions: [],
        evidenceRequired: ['Annual institutional compliance return'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['APPROVED_UNCONDITIONAL'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Approval sanctioned conditionally. Ongoing surveillance active.',
        completionImpact: 'All conditional undertakings fulfilled; advances to final unconditional seal.',
      };

    case 'APPROVED':
    case 'APPROVED_UNCONDITIONAL':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Formal AICTE Approval Order Emitted & Institutional Archive Sealed',
        nextAction: 'Formal AICTE Approval Order Emitted & Institutional Archive Sealed',
        whyRequired: 'Statutory approval granted unconditionally. All compliance requirements fulfilled.',
        why: 'Statutory approval granted unconditionally. All compliance requirements fulfilled.',
        category: 'POST_APPROVAL_MONITORING',
        status: 'COMPLETED',
        responsibleRole: 'CENTRAL_ADMIN',
        assignedOfficer: 'Member Secretary AICTE HQ',
        dueDateTime: 'Compliant & Sealed',
        deadline: 'Compliant & Sealed',
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: 'Closed case dossier archive',
        ruleReference: 'RULE-APH-UNDERTAKINGS-05',
        ruleSource: 'RULE-APH-UNDERTAKINGS-05 (APH Ch. VII, Cl. 7.1)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter VII, Clause 7.1',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: [],
        blockingConditions: [],
        evidenceRequired: [],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: [],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'All statutory requirements completely satisfied and sealed.',
        completionImpact: 'Dossier archived for statutory inspection by Central Vigilance Commission (CVC) and CAG.',
      };

    case 'REJECTED':
    case 'REJECTED_DEFICIENCY':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Speaking Order Issued; 15-day Statutory Appellate Window to SAC Active',
        nextAction: 'File Statutory Appeal to Standing Appellate Committee (SAC)',
        whyRequired: 'Statutory grant declined due to uncured deficiencies. Institution may invoke statutory appeal within 15 calendar days under APH Clause 2.8.',
        why: 'Statutory grant declined due to uncured deficiencies. Institution may invoke statutory appeal within 15 calendar days.',
        category: 'STATUTORY_APPEAL',
        status: 'TERMINAL_APPEAL',
        responsibleRole: 'INSTITUTION_REP',
        assignedOfficer: 'Institution Legal Counsel / Registrar',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'STATUTORY_MANDATE',
        deadlineCalculationBasis: 'Statutory 15-day appellate limitation period (APH Clause 2.8)',
        ruleReference: 'RULE-APH-SAC-APPEAL-04',
        ruleSource: 'RULE-APH-SAC-APPEAL-04 (APH Ch. II, Cl. 2.8)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.8',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: ['Contested grounds of appeal with evidence required'],
        blockingConditions: ['Statutory rejection order in force'],
        evidenceRequired: ['Memorandum of Appeal to Standing Appellate Committee'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['SAC_SHC_REVIEW'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Rejection speaking order issued. Statutory appeal window active.',
        completionImpact: 'Triggers quasi-judicial Standing Appellate Committee (SAC) hearing.',
      };

    case 'SAC_SHC_REVIEW':
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Standing Appellate Committee (SAC) Quasi-Judicial Hearing',
        nextAction: 'Standing Appellate Committee Quasi-Judicial Hearing',
        whyRequired: 'Appellate hearing conducted before retired High Court Judge / Senior Academician panel. Review of contested grounds.',
        why: 'Appellate hearing conducted before retired High Court Judge / Senior Academician panel. Review of contested grounds.',
        category: 'APPELLATE_REVIEW',
        status: 'ACTIONABLE',
        responsibleRole: 'CENTRAL_ADMIN',
        assignedOfficer: 'SAC Chairman & Member Secretary',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'STATUTORY_MANDATE',
        deadlineCalculationBasis: 'Statutory 15-day appellate disposal mandate',
        ruleReference: 'RULE-APH-SAC-APPEAL-04',
        ruleSource: 'RULE-APH-SAC-APPEAL-04 (APH Ch. II, Cl. 2.8)',
        sourceDocument: 'AICTE Approval Process Handbook (Published Baseline 2024–2027)',
        sectionClause: 'Chapter II, Clause 2.8',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'VERIFIED_OFFICIAL_REGULATION',
        prerequisites: basePrereqs,
        missingPrerequisites: [],
        blockingConditions: [],
        evidenceRequired: ['Appellate hearing minutes and judicial finding'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: ['APPROVED', 'REJECTED_DEFICIENCY'],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Contested appeal admitted by Standing Appellate Committee.',
        completionImpact: 'Delivers final appellate determination.',
      };

    default:
      return {
        actionId,
        applicationId: app.id,
        docketNumber: app.docket_number,
        actionTitle: 'Administrative Exception Queue Diagnostic Review',
        nextAction: 'Administrative Diagnostic Review',
        whyRequired: `Application is in unrecognized workflow stage '${app.current_stage}'. Requires manual diagnostic investigation by Central Admin.`,
        why: `Application is in unrecognized stage ${app.current_stage}.`,
        category: 'EXCEPTION_QUEUE',
        status: 'DIAGNOSTIC_EXCEPTION',
        responsibleRole: 'CENTRAL_ADMIN',
        assignedOfficer: 'Bureau Exception Desk',
        dueDateTime: app.sla_deadline,
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: 'Immediate exception queue escalation',
        ruleReference: 'RULE-DEMO-ALERT-06',
        ruleSource: 'RULE-DEMO-ALERT-06 (Operational Prototype Guideline)',
        sourceDocument: 'SIH 2026 Demonstration Configuration Specifications',
        sectionClause: 'Administrative Exception Procedure',
        ruleVersion: app.rule_version,
        ruleVerificationStatus: 'CONFIGURED_DEMO_RULE',
        prerequisites: basePrereqs,
        missingPrerequisites: [`Unrecognized stage: ${app.current_stage}`],
        blockingConditions: ['Invalid stage routing requires central administrative triage'],
        evidenceRequired: ['Administrative diagnostic audit report'],
        evidenceSubmitted: baseEvidence,
        permittedNextStages: [],
        generatedBy: 'DETERMINISTIC_WORKFLOW_POLICY',
        availabilityRationale: 'Diagnostic exception caught by authoritative state machine.',
        completionImpact: 'Resolves corrupted or non-deterministic stage assignment.',
      };
  }
}

// GET /api/applications
applicationsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    let querySql = `
      SELECT 
        a.id, a.docket_number, a.institution_id, i.name as institution_name, i.code as institution_code,
        i.region, i.state, a.academic_year, a.application_type, a.route, a.current_stage,
        a.rule_version, a.rule_provenance, a.submitted_at, a.sla_deadline, a.deadline_type,
        a.deadline_calculation_basis, a.assigned_officer, a.assigned_role, a.land_area_acres,
        a.carpet_area_sqm, a.cadre_ratio, a.trust_deed_valid, a.fire_noc_valid, a.building_plan_valid,
        a.has_pending_undertakings, a.last_action, a.last_action_timestamp
      FROM applications a
      JOIN institutions i ON a.institution_id = i.id
    `;
    const params: any[] = [];

    // Scope restrictions
    if (user.role === 'REGIONAL_OFFICER' && user.regionScope) {
      querySql += ' WHERE i.region = ?';
      params.push(user.regionScope);
    } else if (user.role === 'INSTITUTION_REP' && user.institutionId) {
      querySql += ' WHERE a.institution_id = ?';
      params.push(user.institutionId);
    }

    querySql += ' ORDER BY a.submitted_at DESC;';

    const apps = await query<ApplicationRow>(querySql, params);

    // Fetch deficiencies for all fetched applications
    const appIds = apps.map((a) => a.id);
    let deficiencies: DeficiencyRow[] = [];
    if (appIds.length > 0) {
      const placeholders = appIds.map(() => '?').join(',');
      deficiencies = await query<DeficiencyRow>(
        `SELECT * FROM deficiencies WHERE application_id IN (${placeholders});`,
        appIds
      );
    }

    // Format response matching frontend expectations
    const formatted = apps.map((a) => {
      const appDefs = deficiencies.filter((d) => d.application_id === a.id);
      const ledger = calculateNextAction(a, appDefs);
      return {
        id: a.id,
        docketNumber: a.docket_number,
        institutionName: a.institution_name,
        institutionCode: a.institution_code,
        region: a.region,
        state: a.state,
        academicYear: a.academic_year,
        applicationType: a.application_type,
        route: a.route,
        currentStage: a.current_stage,
        ruleVersion: a.rule_version,
        ruleProvenance: a.rule_provenance,
        submittedAt: a.submitted_at,
        slaDeadline: a.sla_deadline,
        deadlineType: a.deadline_type,
        deadlineCalculationBasis: a.deadline_calculation_basis,
        assignedOfficer: a.assigned_officer,
        assignedRole: a.assigned_role,
        landAreaAcres: a.land_area_acres,
        carpetAreaSqM: a.carpet_area_sqm,
        cadreRatio: a.cadre_ratio,
        trustDeedValid: a.trust_deed_valid === 1,
        fireNocValid: a.fire_noc_valid === 1,
        buildingPlanValid: a.building_plan_valid === 1,
        hasPendingUndertakings: a.has_pending_undertakings === 1,
        lastAction: a.last_action,
        lastActionTimestamp: a.last_action_timestamp,
        deficiencies: appDefs.map((d) => ({
          id: d.id,
          clause: d.clause,
          description: d.description,
          severity: d.severity,
          raisedBy: d.raised_by,
          raisedAt: d.raised_at,
          resolved: d.resolved === 1,
          resolutionNote: d.resolution_note,
        })),
        nextActionLedger: ledger,
      };
    });

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch applications', details: err.message });
  }
});

// GET /api/applications/:id
applicationsRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const app = await queryOne<ApplicationRow>(
      `SELECT 
        a.id, a.docket_number, a.institution_id, i.name as institution_name, i.code as institution_code,
        i.region, i.state, a.academic_year, a.application_type, a.route, a.current_stage,
        a.rule_version, a.rule_provenance, a.submitted_at, a.sla_deadline, a.deadline_type,
        a.deadline_calculation_basis, a.assigned_officer, a.assigned_role, a.land_area_acres,
        a.carpet_area_sqm, a.cadre_ratio, a.trust_deed_valid, a.fire_noc_valid, a.building_plan_valid,
        a.has_pending_undertakings, a.last_action, a.last_action_timestamp
      FROM applications a
      JOIN institutions i ON a.institution_id = i.id
      WHERE a.id = ? OR a.docket_number = ?;`,
      [id, id]
    );

    if (!app) {
      res.status(404).json({ error: `Application docket '${id}' not found` });
      return;
    }

    // Role Scope Checks
    if (user.role === 'REGIONAL_OFFICER' && user.regionScope && app.region !== user.regionScope) {
      res.status(403).json({ error: `Access Denied: Regional Officer scoped to '${user.regionScope}' cannot view dockets in '${app.region}'.` });
      return;
    }
    if (user.role === 'INSTITUTION_REP' && user.institutionId && app.institution_id !== user.institutionId) {
      res.status(403).json({ error: 'Access Denied: Institutional representative cannot access foreign docket.' });
      return;
    }

    const deficiencies = await query<DeficiencyRow>(
      'SELECT * FROM deficiencies WHERE application_id = ?;',
      [app.id]
    );

    const ledger = calculateNextAction(app, deficiencies);

    res.json({
      id: app.id,
      docketNumber: app.docket_number,
      institutionName: app.institution_name,
      institutionCode: app.institution_code,
      region: app.region,
      state: app.state,
      academicYear: app.academic_year,
      applicationType: app.application_type,
      route: app.route,
      currentStage: app.current_stage,
      ruleVersion: app.rule_version,
      ruleProvenance: app.rule_provenance,
      submittedAt: app.submitted_at,
      slaDeadline: app.sla_deadline,
      deadlineType: app.deadline_type,
      deadlineCalculationBasis: app.deadline_calculation_basis,
      assignedOfficer: app.assigned_officer,
      assignedRole: app.assigned_role,
      landAreaAcres: app.land_area_acres,
      carpetAreaSqM: app.carpet_area_sqm,
      cadreRatio: app.cadre_ratio,
      trustDeedValid: app.trust_deed_valid === 1,
      fireNocValid: app.fire_noc_valid === 1,
      buildingPlanValid: app.building_plan_valid === 1,
      hasPendingUndertakings: app.has_pending_undertakings === 1,
      lastAction: app.last_action,
      lastActionTimestamp: app.last_action_timestamp,
      deficiencies: deficiencies.map((d) => ({
        id: d.id,
        clause: d.clause,
        description: d.description,
        severity: d.severity,
        raisedBy: d.raised_by,
        raisedAt: d.raised_at,
        resolved: d.resolved === 1,
        resolutionNote: d.resolution_note,
      })),
      nextActionLedger: ledger,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch application', details: err.message });
  }
});

// POST /api/applications/:id/transition (Authoritative State Machine)
applicationsRouter.post('/:id/transition', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { targetStage, observations, ruleVersion } = req.body;
    const user = req.user!;

    if (!targetStage) {
      res.status(400).json({ error: 'targetStage is required for state transition' });
      return;
    }

    const app = await queryOne<ApplicationRow>(
      `SELECT a.*, i.region, i.name as institution_name
       FROM applications a
       JOIN institutions i ON a.institution_id = i.id
       WHERE a.id = ? OR a.docket_number = ?;`,
      [id, id]
    );

    if (!app) {
      res.status(404).json({ error: `Application docket '${id}' not found` });
      return;
    }

    // Role-based permission checks for transitions
    if (user.role === 'STATUTORY_AUDITOR') {
      res.status(403).json({
        error: 'Access Denied: Statutory Auditor has read-only oversight permissions and cannot alter workflow stages.',
      });
      return;
    }

    if (user.role === 'INSTITUTION_REP') {
      const allowedSource = ['SCRUTINY_DEFICIENCY_RAISED'];
      const allowedTargets = ['UNDER_SCRUTINY', 'RE_SCRUTINY'];
      if (!allowedSource.includes(app.current_stage) || !allowedTargets.includes(targetStage)) {
        res.status(403).json({
          error: 'Access Denied: Institutional Representative may only resubmit dockets when cures have been uploaded.',
        });
        return;
      }
    }

    if (user.role === 'SCRUTINY_OFFICER') {
      const allowedTarget = ['UNDER_SCRUTINY', 'SCRUTINY_CLEARED', 'SCRUTINY_DEFICIENCY_RAISED', 'RE_SCRUTINY'];
      if (!allowedTarget.includes(targetStage)) {
        res.status(403).json({
          error: `Access Denied: Scrutiny Officer cannot transition docket to '${targetStage}'. Permitted: ${allowedTarget.join(', ')}`,
        });
        return;
      }
    }

    if (user.role === 'EVC_COORDINATOR') {
      const allowedTargets: Record<string, string[]> = {
        EVC_QUEUED: ['EVC_SCHEDULED'],
        EVC_SCHEDULED: ['EVC_COMPLETED'],
        SCRUTINY_CLEARED: ['EVC_QUEUED'],
      };
      const valid = allowedTargets[app.current_stage] || [];
      if (!valid.includes(targetStage)) {
        res.status(403).json({
          error: `Access Denied: EVC Coordinator cannot transition docket from '${app.current_stage}' to '${targetStage}'.`,
        });
        return;
      }
    }

    if (user.role === 'REGIONAL_OFFICER') {
      if (app.region !== user.regionScope && user.regionScope !== null) {
        res.status(403).json({
          error: `Insecure Direct Object Reference: RO for '${user.regionScope}' cannot transition docket in '${app.region}'.`,
        });
        return;
      }
    }

    // Prerequisite verification
    const deficiencies = await query<DeficiencyRow>(
      'SELECT * FROM deficiencies WHERE application_id = ?;',
      [app.id]
    );
    const unresolved = deficiencies.filter((d) => d.resolved === 0);

    // If moving to SCRUTINY_CLEARED, must have zero unresolved deficiencies and valid documents
    if (targetStage === 'SCRUTINY_CLEARED') {
      const blockers: string[] = [];
      if (unresolved.length > 0) {
        blockers.push(`${unresolved.length} unresolved deficiency(ies) pending remediation.`);
      }
      if (app.trust_deed_valid === 0) {
        blockers.push('Trust/Society deed registration not marked valid.');
      }
      if (app.fire_noc_valid === 0) {
        blockers.push('Fire Safety NOC expired or unverified.');
      }
      if (app.building_plan_valid === 0) {
        blockers.push('Competent Municipal Building Plan approval missing.');
      }

      if (blockers.length > 0) {
        res.status(400).json({
          error: 'Statutory Transition Blocked: Mandatory prerequisites not satisfied.',
          targetStage,
          ruleSource: 'RULE-APH-SCRUTINY-01 (APH Ch. II, Cl. 2.3.1)',
          missingPrerequisites: blockers,
        });
        return;
      }
    }

    // If sealing as APPROVED_UNCONDITIONAL, all undertakings must be VERIFIED_COMPLIANT
    if (targetStage === 'APPROVED_UNCONDITIONAL') {
      const pendingUndertakings = await query<any>(
        "SELECT id, title FROM undertakings WHERE application_id = ? AND status != 'VERIFIED_COMPLIANT';",
        [app.id]
      );
      if (pendingUndertakings.length > 0) {
        res.status(400).json({
          error: 'Statutory Transition Blocked: All time-bound conditional undertakings must be verified compliant before final unconditional sanction.',
          targetStage,
          ruleSource: 'RULE-APH-UNDERTAKINGS-05 (APH Ch. VII, Cl. 7.4)',
          missingPrerequisites: pendingUndertakings.map((u) => `Undertaking '${u.title}' is not yet verified compliant.`),
        });
        return;
      }
    }

    // If moving to EVC_SCHEDULED, ensure panel does not have critical conflicts
    if (targetStage === 'EVC_SCHEDULED') {
      const evc = await queryOne<any>(
        'SELECT conflict_check_status, conflict_check_notes FROM evc_records WHERE application_id = ?;',
        [app.id]
      );
      if (evc && evc.conflict_check_status === 'CONFLICT_CONFIRMED') {
        res.status(400).json({
          error: 'Statutory Transition Blocked: Empanelled EVC committee has confirmed conflict of interest.',
          targetStage,
          ruleSource: 'RULE-APH-EVC-03 (APH Ch. II, Cl. 2.5)',
          missingPrerequisites: [evc.conflict_check_notes || 'Confirmed conflict of interest detected in expert panel.'],
        });
        return;
      }
    }

    // Execute state transition atomically inside transaction
    const finalRuleVersion = ruleVersion || app.rule_version || 'APH-2024-27-REV-02';
    const nowIso = new Date().toISOString();
    const actionDesc = observations || `Transitioned from ${app.current_stage} to ${targetStage} by ${user.name} (${user.role})`;

    const updatedApp = await transaction(async () => {
      // Re-query within transaction lock for optimistic concurrency control
      const freshCheck = await queryOne<ApplicationRow>('SELECT current_stage FROM applications WHERE id = ?;', [app.id]);
      if (!freshCheck || freshCheck.current_stage !== app.current_stage) {
        const conflictErr = new Error(`CONCURRENT_CONFLICT: Application stage was modified concurrently to '${freshCheck?.current_stage}'. Request rejected.`);
        (conflictErr as any).status = 409;
        throw conflictErr;
      }

      await execute(
        `UPDATE applications 
         SET current_stage = ?, last_action = ?, last_action_timestamp = ?, rule_version = ?
         WHERE id = ?;`,
        [targetStage, actionDesc, nowIso, finalRuleVersion, app.id]
      );

      // Append SHA-256 Audit Block
      const auditBlock = await appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'STAGE_TRANSITION',
        docketNumber: app.docket_number,
        previousStage: app.current_stage,
        newStage: targetStage,
        ruleVersion: finalRuleVersion,
        reasonOrObservations: actionDesc,
        ipAddress: req.ip || '127.0.0.1',
      });

      return {
        id: app.id,
        docketNumber: app.docket_number,
        previousStage: app.current_stage,
        newStage: targetStage,
        auditBlockHeight: auditBlock.block_height,
        auditCurrentHash: auditBlock.current_hash,
      };
    });

    res.json({
      success: true,
      message: `Docket ${app.docket_number} successfully transitioned to ${targetStage}.`,
      transition: updatedApp,
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({ error: 'Transition failed', details: err.message });
  }
});

// POST /api/applications/:id/deficiencies (Raise deficiency)
applicationsRouter.post('/:id/deficiencies', requireAuth, requireRoles('SCRUTINY_OFFICER', 'REGIONAL_OFFICER', 'CENTRAL_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { clause, description, severity } = req.body;
    const user = req.user!;

    if (!clause || !description) {
      res.status(400).json({ error: 'clause and description are required' });
      return;
    }

    const app = await queryOne<ApplicationRow>('SELECT * FROM applications WHERE id = ? OR docket_number = ?;', [id, id]);
    if (!app) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const defId = `def-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    await transaction(async () => {
      await execute(
        `INSERT INTO deficiencies (id, application_id, clause, description, severity, raised_by, raised_at, resolved, resolution_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL);`,
        [defId, app.id, clause, description, severity || 'CRITICAL', user.name, nowIso]
      );

      // Auto update stage to SCRUTINY_DEFICIENCY_RAISED if in SCRUTINY
      if (app.current_stage === 'UNDER_SCRUTINY') {
        await execute(
          `UPDATE applications SET current_stage = 'SCRUTINY_DEFICIENCY_RAISED', last_action = ?, last_action_timestamp = ? WHERE id = ?;`,
          [`Deficiency raised under ${clause}: ${description}`, nowIso, app.id]
        );
      }

      await appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'DEFICIENCY_POINTED',
        docketNumber: app.docket_number,
        previousStage: app.current_stage,
        newStage: app.current_stage === 'UNDER_SCRUTINY' ? 'SCRUTINY_DEFICIENCY_RAISED' : app.current_stage,
        ruleVersion: app.rule_version,
        reasonOrObservations: `Raised deficiency under ${clause}: ${description} (${severity || 'CRITICAL'})`,
      });
    });

    res.json({ success: true, deficiencyId: defId, message: 'Deficiency registered and audit logged.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record deficiency', details: err.message });
  }
});

// PUT /api/applications/:id/deficiencies/:defId/resolve
applicationsRouter.put('/:id/deficiencies/:defId/resolve', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, defId } = req.params;
    const { resolutionNote } = req.body;
    const user = req.user!;

    const app = await queryOne<ApplicationRow>('SELECT * FROM applications WHERE id = ? OR docket_number = ?;', [id, id]);
    if (!app) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const def = await queryOne<DeficiencyRow>('SELECT * FROM deficiencies WHERE id = ? AND application_id = ?;', [defId, app.id]);
    if (!def) {
      res.status(404).json({ error: 'Deficiency not found' });
      return;
    }

    await transaction(async () => {
      await execute(
        'UPDATE deficiencies SET resolved = 1, resolution_note = ? WHERE id = ?;',
        [resolutionNote || 'Remediated by institution with supporting documentation.', defId]
      );

      // Check if all deficiencies are now resolved
      const remaining = await query<DeficiencyRow>(
        'SELECT * FROM deficiencies WHERE application_id = ? AND resolved = 0;',
        [app.id]
      );

      const note = `Deficiency resolved (${def.clause}): ${resolutionNote || 'Remediated'}. Remaining open: ${remaining.length}`;

      await execute(
        'UPDATE applications SET last_action = ?, last_action_timestamp = ? WHERE id = ?;',
        [note, new Date().toISOString(), app.id]
      );

      await appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'DEFICIENCY_REMEDIATED',
        docketNumber: app.docket_number,
        previousStage: app.current_stage,
        newStage: app.current_stage,
        ruleVersion: app.rule_version,
        reasonOrObservations: note,
      });
    });

    res.json({ success: true, message: 'Deficiency successfully resolved.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve deficiency', details: err.message });
  }
});
