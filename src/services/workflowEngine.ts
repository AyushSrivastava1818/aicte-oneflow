import { 
  Application, 
  CommitteeExpert, 
  CryptographicAuditRecord, 
  NextBestAction, 
  Role, 
  WorkflowStage 
} from '../types';
import { 
  CasePrerequisite, 
  ConflictCheckStatus, 
  ExplainableCaseAction 
} from '../types/regulatory';
import { OFFICIAL_REGULATORY_RULES } from '../data/regulatoryRules';

/**
 * AICTE Approval Process Handbook (APH) Statutory Engine
 * Deterministic State Machine, Explainable Case Action Ledger & Hash Chain Ledger
 */

export async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Canonical JSON serialization for audit block hashing
 * Guarantees deterministic key ordering to avoid key-order hashing discrepancies.
 */
export function createCanonicalPayload(block: {
  blockHeight: number;
  timestamp: string;
  actorId: string;
  actionType: string;
  docketNumber: string;
  previousStage: string;
  newStage: string;
  previousHash: string;
  reasonOrObservations: string;
  ruleVersion: string;
}): string {
  const canonicalObj = {
    actionType: block.actionType,
    actorId: block.actorId,
    blockHeight: block.blockHeight,
    docketNumber: block.docketNumber,
    newStage: block.newStage,
    previousHash: block.previousHash,
    previousStage: block.previousStage,
    reasonOrObservations: block.reasonOrObservations,
    ruleVersion: block.ruleVersion,
    timestamp: block.timestamp,
  };
  return JSON.stringify(canonicalObj);
}

export function calculateDaysRemaining(targetDateStr: string, referenceDate: Date = new Date()): number {
  const target = new Date(targetDateStr);
  const diffTime = target.getTime() - referenceDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Objective EVC Expert Conflict of Interest Evaluator
 * Avoids unsubstantiated 'conflict-free' claims by returning qualified statuses and documenting the review scope.
 */
export function evaluateEVCConflictStatus(
  experts: CommitteeExpert[],
  institutionState: string
): {
  status: ConflictCheckStatus;
  scope: string;
  notes: string;
} {
  const scope = 'Evaluated empanelled academic affiliation, home state, and declared trust relationships against AICTE conflict guidelines.';

  if (!experts || experts.length === 0) {
    return {
      status: 'CHECK_NOT_RUN',
      scope,
      notes: 'No committee experts empanelled yet for this docket.',
    };
  }

  // Check 1: Known trust or commercial affiliation
  const hasDirectAffiliation = experts.some(e => e.hasAffiliationWithTrust);
  if (hasDirectAffiliation) {
    return {
      status: 'CONFLICT_CONFIRMED',
      scope,
      notes: 'Direct conflict detected: At least one empanelled expert has declared prior trust or governance affiliation.',
    };
  }

  // Check 2: Same state or institutional origin
  const hasSameState = experts.some(e => 
    e.state.toLowerCase().trim() === institutionState.toLowerCase().trim()
  );
  if (hasSameState) {
    return {
      status: 'POTENTIAL_CONFLICT_REQUIRES_REVIEW',
      scope,
      notes: 'Expert from same state as applicant institution. Requires authorized Regional Coordinator review under APH Clause 2.5(c).',
    };
  }

  return {
    status: 'NO_KNOWN_CONFLICT_DETECTED',
    scope,
    notes: 'No known conflicts detected within evaluated scope (different states, zero declared trust affiliations).',
  };
}

/**
 * Check all mandatory case prerequisites based on current stage and docket evidence
 */
export function evaluatePrerequisites(app: Application): CasePrerequisite[] {
  const list: CasePrerequisite[] = [
    {
      id: 'prereq-trust-deed',
      name: 'Registered Trust / Society Deed Validity',
      clauseReference: 'APH Chapter I, Clause 1.4(a)',
      satisfied: app.trustDeedValid,
      blockerDetail: app.trustDeedValid ? undefined : 'Trust/Society registration deed renewal or certification is pending.',
      evidenceReference: 'Trust_Registration_Deed.pdf',
    },
    {
      id: 'prereq-fire-noc',
      name: 'State Fire Services Final NOC',
      clauseReference: 'APH Chapter IV, Clause 4.12(b)',
      satisfied: app.fireNocValid,
      blockerDetail: app.fireNocValid ? undefined : 'Fire & Life Safety NOC missing or issued under provisional authority.',
      evidenceReference: 'State_Fire_Safety_Certificate.pdf',
    },
    {
      id: 'prereq-building-plan',
      name: 'Municipal Approved Building & Occupancy Plan',
      clauseReference: 'APH Chapter III, Clause 3.8',
      satisfied: app.buildingPlanValid,
      blockerDetail: app.buildingPlanValid ? undefined : 'Sanctioned architectural building plan or occupancy certificate pending.',
      evidenceReference: 'Sanctioned_Building_Plan_PWD.pdf',
    },
    {
      id: 'prereq-scrutiny-deficiencies',
      name: 'Zero Critical Deficiencies on Observation Checklist',
      clauseReference: 'APH Chapter II, Clause 2.3 & Form 15',
      satisfied: !app.deficiencies.some(d => !d.resolved && d.severity === 'CRITICAL'),
      blockerDetail: app.deficiencies.some(d => !d.resolved && d.severity === 'CRITICAL')
        ? `${app.deficiencies.filter(d => !d.resolved && d.severity === 'CRITICAL').length} critical deficiency requires institutional rectification.`
        : undefined,
    },
  ];

  if (app.currentStage === 'APPROVED_WITH_UNDERTAKINGS') {
    list.push({
      id: 'prereq-undertakings-fulfilled',
      name: 'Time-Bound Compliance Undertakings Certified',
      clauseReference: 'APH Chapter I, Clause 1.4(g) & 7.4',
      satisfied: !app.hasPendingUndertakings,
      blockerDetail: app.hasPendingUndertakings
        ? 'Active post-approval undertakings under statutory monitoring window.'
        : undefined,
    });
  }

  return list;
}

/**
 * Generate Explainable Case Action Ledger entry
 * Deterministic recommendation with rule source, blockers, prerequisites, and deadline justification.
 */
export function generateExplainableCaseAction(app: Application): ExplainableCaseAction {
  const daysLeft = calculateDaysRemaining(app.slaDeadline);
  const isOverdue = daysLeft < 0;
  const prereqs = evaluatePrerequisites(app);
  const blockers: string[] = prereqs.filter(p => !p.satisfied && p.blockerDetail).map(p => p.blockerDetail!);

  // Map to relevant regulatory rule from registry
  let matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-SCRUTINY-01'];
  let actionTitle = 'Assign Scrutiny Officer & Verify Initial Docket Uploads';
  let actionRationale = 'Application received in portal. Form 15 preliminary scrutiny must be initiated to verify statutory uploads.';
  let responsibleRole: Role = 'REGIONAL_OFFICER';

  switch (app.currentStage) {
    case 'APPLICATION_SUBMITTED':
      matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-SCRUTINY-01'];
      actionTitle = 'Assign Bureau Scrutiny Officer (Form 15 Checklist)';
      actionRationale = 'New application docket registered. Under APH Clause 2.3, Regional Office must assign bureau desk officer to begin scrutiny.';
      responsibleRole = 'REGIONAL_OFFICER';
      break;

    case 'UNDER_SCRUTINY': {
      matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-SCRUTINY-01'];
      const hasUnresolved = app.deficiencies.some(d => !d.resolved);
      if (hasUnresolved) {
        actionTitle = 'Issue Form 17 Deficiency Memorandum to Institution';
        actionRationale = 'Technical scrutiny flagged deficiencies in submitted documentation. Scrutiny Desk must issue Form 17 to grant statutory rectification window.';
      } else {
        actionTitle = 'Certify Scrutiny Cleared (Checklist Form 15 Sign-off)';
        actionRationale = 'All scrutiny checklist clauses verified compliant. Desk officer can certify Scrutiny Cleared.';
      }
      responsibleRole = 'SCRUTINY_OFFICER';
      break;
    }

    case 'SCRUTINY_DEFICIENCY_RAISED':
      matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-DEFICIENCY-02'];
      actionTitle = 'Institution to Submit Clarifications & Rectification Evidence';
      actionRationale = 'Statutory rectification window active under APH Clause 2.4(a). Institution must upload compliance proof for pointed deficiencies.';
      responsibleRole = 'INSTITUTION_REP';
      break;

    case 'RE_SCRUTINY':
      matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-SCRUTINY-01'];
      actionTitle = 'Evaluate Resubmitted Rectifications & Close Observation Checklist';
      actionRationale = 'Institution submitted rectification documents. Scrutiny Committee must re-evaluate compliance before cleared sign-off.';
      responsibleRole = 'SCRUTINY_OFFICER';
      break;

    case 'SCRUTINY_CLEARED':
      if (app.route === 'ROUTE_EOA') {
        matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-UNDERTAKINGS-05'];
        actionTitle = 'Issue Extension of Approval (EoA) Order with Undertaking Register';
        actionRationale = 'Scrutiny cleared for Extension of Approval. Regional Officer authorized to grant EoA subject to routine undertakings.';
        responsibleRole = 'REGIONAL_OFFICER';
      } else {
        matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-EVC-03'];
        actionTitle = 'Queue for Expert Visit Committee (EVC) Panel Dispatch';
        actionRationale = 'Mandatory preliminary scrutiny cleared for New Institution / Intake Increase. Route requires peer committee field/virtual inspection.';
        responsibleRole = 'EVC_COORDINATOR';
      }
      break;

    case 'EVC_QUEUED':
      matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-EVC-03'];
      actionTitle = 'Constitute Conflict-Free Peer Committee & Schedule Inspection';
      actionRationale = 'Docket awaiting panel constitution under APH Clause 2.5. Coordinator must verify conflict status and readiness checks prior to confirmation.';
      responsibleRole = 'EVC_COORDINATOR';
      break;

    case 'EVC_SCHEDULED':
      matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-EVC-03'];
      actionTitle = 'Conduct Inspection & Upload Committee Inspection Matrix';
      actionRationale = 'Inspection date confirmed. Peer committee to conduct inspection and log outcome recommendations.';
      responsibleRole = 'EVC_COORDINATOR';
      break;

    case 'EVC_COMPLETED':
      matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-SCRUTINY-01'];
      actionTitle = 'Forward EVC Outcome to Standing Appellate / Executive Council';
      actionRationale = 'Inspection completed and report received. Case submitted for statutory council sanction.';
      responsibleRole = 'REGIONAL_OFFICER';
      break;

    case 'SAC_SHC_REVIEW':
      matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-SAC-APPEAL-04'];
      actionTitle = 'Conduct Standing Hearing Committee (SHC) Proceedings';
      actionRationale = 'Contested deficiency or appeal pending before Standing Hearing Committee under APH Clause 2.8.';
      responsibleRole = 'CENTRAL_ADMIN';
      break;

    case 'APPROVED_WITH_UNDERTAKINGS':
      matchedRule = OFFICIAL_REGULATORY_RULES['RULE-APH-UNDERTAKINGS-05'];
      actionTitle = 'Monitor Active Time-Bound Undertakings & Lease Expiry Radar';
      actionRationale = 'Approval sanctioned subject to post-approval obligations under APH Clause 1.4(g) & 7.4. Surveillance radar active.';
      responsibleRole = 'REGIONAL_OFFICER';
      break;

    case 'APPROVED_UNCONDITIONAL':
      actionTitle = 'Formal AICTE Approval Order Emitted & Institutional Archive Sealed';
      actionRationale = 'Statutory approval granted unconditionally. All compliance requirements fulfilled.';
      responsibleRole = 'CENTRAL_ADMIN';
      break;

    case 'REJECTED':
      actionTitle = 'Speaking Order Communicated with 15-day Appeal Window to SAC';
      actionRationale = 'Rejection speaking order issued under APH guidelines. Institution may submit appeal to SAC within 15 days.';
      responsibleRole = 'REGIONAL_OFFICER';
      break;
  }

  // Supporting evidence dossier
  const supportingEvidence = [
    {
      name: 'Registered 30-Year Land Lease / Sale Deed',
      type: 'Land & Building Title',
      status: app.trustDeedValid ? ('VERIFIED_GENUINE' as const) : ('PENDING_OFFICER_REVIEW' as const),
      notes: app.trustDeedValid ? 'Verified against state land registry.' : 'Awaiting sub-registrar authentication.',
    },
    {
      name: 'State Fire Services Certificate',
      type: 'Life & Fire Safety',
      status: app.fireNocValid ? ('VERIFIED_GENUINE' as const) : ('RETURNED_DEFICIENT' as const),
      notes: app.fireNocValid ? 'Compliant with National Building Code Part IV.' : 'Provisional NOC rejected. Final certificate required.',
    },
    {
      name: 'Approved Structural Soundness & Occupancy Plan',
      type: 'Civil Infrastructure',
      status: app.buildingPlanValid ? ('VERIFIED_GENUINE' as const) : ('PENDING_OFFICER_REVIEW' as const),
    },
  ];

  // Permitted transitions
  const permittedTransitions = [
    {
      targetStage: 'UNDER_SCRUTINY' as WorkflowStage,
      label: 'Begin Scrutiny Verification',
      authorizedRoles: ['SCRUTINY_OFFICER' as Role, 'REGIONAL_OFFICER' as Role, 'CENTRAL_ADMIN' as Role],
      canExecute: app.currentStage === 'APPLICATION_SUBMITTED',
      blockerReason: app.currentStage !== 'APPLICATION_SUBMITTED' ? 'Docket already past preliminary intake' : undefined,
    },
    {
      targetStage: 'SCRUTINY_CLEARED' as WorkflowStage,
      label: 'Certify Scrutiny Cleared',
      authorizedRoles: ['SCRUTINY_OFFICER' as Role, 'REGIONAL_OFFICER' as Role, 'CENTRAL_ADMIN' as Role],
      canExecute: (app.currentStage === 'UNDER_SCRUTINY' || app.currentStage === 'RE_SCRUTINY') && blockers.length === 0,
      blockerReason: blockers.length > 0 ? blockers[0] : undefined,
    },
    {
      targetStage: 'SCRUTINY_DEFICIENCY_RAISED' as WorkflowStage,
      label: 'Issue Deficiency Memorandum',
      authorizedRoles: ['SCRUTINY_OFFICER' as Role, 'REGIONAL_OFFICER' as Role],
      canExecute: app.currentStage === 'UNDER_SCRUTINY',
    },
    {
      targetStage: 'EVC_QUEUED' as WorkflowStage,
      label: 'Queue for EVC Committee',
      authorizedRoles: ['REGIONAL_OFFICER' as Role, 'EVC_COORDINATOR' as Role, 'CENTRAL_ADMIN' as Role],
      canExecute: app.currentStage === 'SCRUTINY_CLEARED' && app.route !== 'ROUTE_EOA',
      blockerReason: app.currentStage !== 'SCRUTINY_CLEARED' ? 'Scrutiny must be cleared first' : undefined,
    },
    {
      targetStage: 'APPROVED_WITH_UNDERTAKINGS' as WorkflowStage,
      label: 'Sanction Approval (with Undertakings)',
      authorizedRoles: ['REGIONAL_OFFICER' as Role, 'CENTRAL_ADMIN' as Role],
      canExecute: app.currentStage === 'EVC_COMPLETED' || (app.currentStage === 'SCRUTINY_CLEARED' && app.route === 'ROUTE_EOA'),
    },
    {
      targetStage: 'APPROVED_UNCONDITIONAL' as WorkflowStage,
      label: 'Seal Unconditional Approval',
      authorizedRoles: ['CENTRAL_ADMIN' as Role],
      canExecute: app.currentStage === 'APPROVED_WITH_UNDERTAKINGS' && !app.hasPendingUndertakings,
      blockerReason: app.hasPendingUndertakings ? 'Active undertakings must be verified compliant first' : undefined,
    },
  ];

  return {
    caseId: app.id,
    docketNumber: app.docketNumber,
    institutionName: app.institutionName,
    workflowState: app.currentStage,
    recommendedAction: actionTitle,
    actionRationale,
    responsibleRole,
    assignedOfficer: app.assignedOfficer,
    deadlineDate: app.slaDeadline,
    deadlineType: app.deadlineType || matchedRule.deadlineType,
    deadlineCalculationExplanation: app.deadlineCalculationBasis || `Calculated as ${matchedRule.defaultDurationDays} days under ${matchedRule.clause} standard.`,
    daysRemaining: daysLeft,
    isOverdue,
    prerequisites: prereqs,
    blockers,
    supportingEvidence,
    regulatorySource: {
      ruleId: matchedRule.ruleId,
      clause: matchedRule.clause,
      documentTitle: matchedRule.documentTitle,
      status: matchedRule.status,
      sourceReference: matchedRule.sourceReference,
    },
    permittedTransitions,
  };
}

/**
 * Backward-compatible Next Best Action mapper
 */
export function determineNextBestAction(app: Application): NextBestAction {
  const explainable = generateExplainableCaseAction(app);

  return {
    stage: explainable.workflowState.replace(/_/g, ' '),
    actionTitle: explainable.recommendedAction,
    responsibleRole: explainable.responsibleRole,
    statutoryDeadline: explainable.deadlineDate,
    daysRemaining: explainable.daysRemaining,
    isOverdue: explainable.isOverdue,
    blockingReasons: explainable.blockers,
    canExecute: explainable.permittedTransitions.some(t => t.canExecute),
    escalationNotice: explainable.isOverdue
      ? `Overdue (${Math.abs(explainable.daysRemaining)}d past ${explainable.deadlineType}): Escalated to designated authority.`
      : undefined,
  };
}

/**
 * Validate State Transition against statutory Approval Process Handbook prerequisites
 */
export function validateStateTransition(
  app: Application,
  targetStage: WorkflowStage,
  actorRole: Role
): { valid: boolean; message: string; blockers?: string[] } {
  // Check role authorization
  const allowedRolesForStage: Record<WorkflowStage, Role[]> = {
    APPLICATION_SUBMITTED: ['INSTITUTION_REP', 'CENTRAL_ADMIN'],
    UNDER_SCRUTINY: ['REGIONAL_OFFICER', 'SCRUTINY_OFFICER', 'CENTRAL_ADMIN'],
    SCRUTINY_DEFICIENCY_RAISED: ['SCRUTINY_OFFICER', 'REGIONAL_OFFICER', 'CENTRAL_ADMIN'],
    RE_SCRUTINY: ['INSTITUTION_REP', 'SCRUTINY_OFFICER', 'CENTRAL_ADMIN'],
    SCRUTINY_CLEARED: ['SCRUTINY_OFFICER', 'REGIONAL_OFFICER', 'CENTRAL_ADMIN'],
    EVC_QUEUED: ['REGIONAL_OFFICER', 'EVC_COORDINATOR', 'CENTRAL_ADMIN'],
    EVC_SCHEDULED: ['EVC_COORDINATOR', 'CENTRAL_ADMIN'],
    EVC_COMPLETED: ['EVC_COORDINATOR', 'REGIONAL_OFFICER', 'CENTRAL_ADMIN'],
    SAC_SHC_REVIEW: ['CENTRAL_ADMIN', 'REGIONAL_OFFICER'],
    COUNCIL_DECISION_PENDING: ['CENTRAL_ADMIN'],
    APPROVED_WITH_UNDERTAKINGS: ['CENTRAL_ADMIN', 'REGIONAL_OFFICER'],
    APPROVED_UNCONDITIONAL: ['CENTRAL_ADMIN'],
    REJECTED: ['CENTRAL_ADMIN', 'REGIONAL_OFFICER'],
  };

  if (!allowedRolesForStage[targetStage]?.includes(actorRole) && actorRole !== 'CENTRAL_ADMIN') {
    return {
      valid: false,
      message: `Statutory Access Violation: Role '${actorRole}' is not authorized to transition docket to '${targetStage}' under Rule APH 2.4.`,
    };
  }

  const prereqs = evaluatePrerequisites(app);
  const activeBlockers = prereqs.filter(p => !p.satisfied && p.blockerDetail).map(p => p.blockerDetail!);

  // Check stage specific prerequisites
  if (targetStage === 'SCRUTINY_CLEARED') {
    if (activeBlockers.length > 0) {
      return {
        valid: false,
        message: `Prerequisite Failure: Cannot clear Scrutiny while mandatory blockers exist.`,
        blockers: activeBlockers,
      };
    }
  }

  if (targetStage === 'EVC_QUEUED') {
    if (app.currentStage !== 'SCRUTINY_CLEARED' && app.currentStage !== 'RE_SCRUTINY') {
      return {
        valid: false,
        message: 'Workflow Sequence Violation: EVC Queue can only be entered after Scrutiny clearance is formally logged.',
      };
    }
  }

  if (targetStage === 'APPROVED_UNCONDITIONAL') {
    if (app.hasPendingUndertakings) {
      return {
        valid: false,
        message: 'Compliance Prerequisite Failure: Institution has active unfulfilled statutory undertakings.',
      };
    }
  }

  return { valid: true, message: 'Prerequisites validated successfully.' };
}

/**
 * Hash-Chained Audit Log Integrity Checker
 * Verifies that the cryptographic SHA-256 chain has zero broken links or altered payloads.
 */
export async function verifyAuditLedgerIntegrity(records: CryptographicAuditRecord[]): Promise<{
  isChainValid: boolean;
  brokenBlockIndex: number | null;
  message: string;
}> {
  if (records.length === 0) {
    return { isChainValid: true, brokenBlockIndex: null, message: 'Audit ledger is empty.' };
  }

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    
    // Check genesis block previous hash
    if (i === 0) {
      if (rec.previousHash !== 'GENESIS_BLOCK_AICTE_ONEFLOW_00000000000000000000000000000000') {
        return {
          isChainValid: false,
          brokenBlockIndex: 0,
          message: 'Genesis block previous hash tampering detected. Trust anchor broken at block #1.',
        };
      }
    } else {
      // Check link to previous block
      if (rec.previousHash !== records[i - 1].currentHash) {
        return {
          isChainValid: false,
          brokenBlockIndex: i,
          message: `Hash link mismatch at block #${rec.blockHeight}. Previous hash does not match hash of block #${records[i - 1].blockHeight}.`,
        };
      }
    }

    // Recompute current hash using canonical payload serialization
    const canonicalPayload = rec.canonicalPayload || createCanonicalPayload(rec);
    const calculatedHash = await computeSha256(canonicalPayload);

    if (calculatedHash !== rec.currentHash) {
      return {
        isChainValid: false,
        brokenBlockIndex: i,
        message: `Content modification detected in block #${rec.blockHeight}. Stored hash does not match computed payload hash.`,
      };
    }
  }

  return {
    isChainValid: true,
    brokenBlockIndex: null,
    message: `All ${records.length} audit blocks verified cryptographically via SHA-256. Zero tampering detected.`,
  };
}
