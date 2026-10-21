import { Application, CryptographicAuditRecord, NextBestAction, Role, WorkflowStage } from '../types';

/**
 * AICTE Approval Process Handbook (APH 2026-27) Statutory Engine
 * Deterministic State Machine & Next Best Administrative Action (NBAA)
 */

export async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function calculateDaysRemaining(targetDateStr: string): number {
  const target = new Date(targetDateStr);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Deterministic Next Best Administrative Action (NBAA) Engine
 * Identifies the exact statutory owner, deadline, and blocker conditions.
 */
export function determineNextBestAction(app: Application): NextBestAction {
  const daysLeft = calculateDaysRemaining(app.slaDeadline);
  const isOverdue = daysLeft < 0;
  const blockingReasons: string[] = [];

  switch (app.currentStage) {
    case 'APPLICATION_SUBMITTED':
      return {
        stage: 'Preliminary Verification',
        actionTitle: 'Assign Scrutiny Officer & Verify Initial Docket Uploads',
        responsibleRole: 'REGIONAL_OFFICER',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: [],
        canExecute: true,
        escalationNotice: isOverdue ? 'CRITICAL: Initial assignment delayed past statutory SLA limit' : undefined,
      };

    case 'UNDER_SCRUTINY': {
      const hasUnresolved = app.deficiencies.some(d => !d.resolved);
      if (hasUnresolved) {
        blockingReasons.push('Active deficiencies flagged during document examination');
      }
      if (!app.trustDeedValid) blockingReasons.push('Trust/Society deed registration verification pending');
      if (!app.fireNocValid) blockingReasons.push('Fire & Life Safety NOC expired or missing');

      return {
        stage: 'Bureau Document Scrutiny',
        actionTitle: hasUnresolved 
          ? 'Issue Form 17 Deficiency Memorandum to Institution'
          : 'Certify Scrutiny Cleared (Checklist Form 15 Sign-off)',
        responsibleRole: 'SCRUTINY_OFFICER',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons,
        canExecute: true,
        escalationNotice: isOverdue ? 'Overdue: Regional Officer informed of scrutiny docket ageing' : undefined,
      };
    }

    case 'SCRUTINY_DEFICIENCY_RAISED':
      return {
        stage: 'Institutional Rectification Window',
        actionTitle: 'Institution to Submit Clarifications & Rectification Evidence',
        responsibleRole: 'INSTITUTION_REP',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: ['Waiting for institution to submit rectifications for flagged clauses'],
        canExecute: false,
        escalationNotice: isOverdue ? 'Hearing Notice SAC scheduled due to institutional non-submission' : undefined,
      };

    case 'RE_SCRUTINY':
      return {
        stage: 'Re-Scrutiny Committee Review',
        actionTitle: 'Evaluate Resubmitted Rectifications & Close Observation Checklist',
        responsibleRole: 'SCRUTINY_OFFICER',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: [],
        canExecute: true,
      };

    case 'SCRUTINY_CLEARED':
      if (app.route === 'ROUTE_EOA') {
        return {
          stage: 'Approval Sanction',
          actionTitle: 'Issue Extension of Approval (EoA) Order with Undertaking Register',
          responsibleRole: 'REGIONAL_OFFICER',
          statutoryDeadline: app.slaDeadline,
          daysRemaining: daysLeft,
          isOverdue,
          blockingReasons: [],
          canExecute: true,
        };
      } else {
        return {
          stage: 'EVC Dispatch Preparation',
          actionTitle: 'Queue for Expert Visit Committee (EVC) Panel Dispatch',
          responsibleRole: 'EVC_COORDINATOR',
          statutoryDeadline: app.slaDeadline,
          daysRemaining: daysLeft,
          isOverdue,
          blockingReasons: [],
          canExecute: true,
        };
      }

    case 'EVC_QUEUED':
      return {
        stage: 'Expert Panel Constitution',
        actionTitle: 'Constitute Conflict-Free Peer Committee & Schedule Field/Virtual Inspection',
        responsibleRole: 'EVC_COORDINATOR',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: [],
        canExecute: true,
        escalationNotice: isOverdue ? 'EVC Panel assignment breached 10-day scheduling ceiling' : undefined,
      };

    case 'EVC_SCHEDULED':
      return {
        stage: 'On-Site / Virtual EVC Inspection',
        actionTitle: 'Conduct Inspection & Upload Geo-tagged Committee Inspection Matrix',
        responsibleRole: 'EVC_COORDINATOR',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: ['Visit date scheduled. Awaiting on-site inspection completion and signatory sign-off.'],
        canExecute: true,
      };

    case 'EVC_COMPLETED':
      return {
        stage: 'Regional Committee Recommendation',
        actionTitle: 'Forward EVC Outcome to Standing Appellate / Executive Council',
        responsibleRole: 'REGIONAL_OFFICER',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: [],
        canExecute: true,
      };

    case 'SAC_SHC_REVIEW':
      return {
        stage: 'Appeals / Hearing Committee',
        actionTitle: 'Conduct Standing Hearing Committee (SHC) Quasi-Judicial Proceedings',
        responsibleRole: 'CENTRAL_ADMIN',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: [],
        canExecute: true,
      };

    case 'COUNCIL_DECISION_PENDING':
      return {
        stage: 'Competent Statutory Authority',
        actionTitle: 'AICTE Executive Committee / Council Final Sanction Order',
        responsibleRole: 'CENTRAL_ADMIN',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: [],
        canExecute: true,
      };

    case 'APPROVED_WITH_UNDERTAKINGS':
      return {
        stage: 'Post-Approval Compliance Monitoring',
        actionTitle: 'Monitor Active Time-Bound Undertakings & Lease Expiry Radar',
        responsibleRole: 'REGIONAL_OFFICER',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: app.hasPendingUndertakings ? ['Active compliance undertakings under 60-day fulfillment window'] : [],
        canExecute: true,
      };

    case 'APPROVED_UNCONDITIONAL':
      return {
        stage: 'Statutory Order Dispatched',
        actionTitle: 'Formal AICTE Approval Order Emitted & Institutional Archive Sealed',
        responsibleRole: 'CENTRAL_ADMIN',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: 999,
        isOverdue: false,
        blockingReasons: [],
        canExecute: false,
      };

    case 'REJECTED':
      return {
        stage: 'Order of Rejection Passed',
        actionTitle: 'Speaking Order Communicated with 15-day Appeal Window to SAC',
        responsibleRole: 'REGIONAL_OFFICER',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue: false,
        blockingReasons: ['Case disposed with reasoned rejection order'],
        canExecute: false,
      };

    default:
      return {
        stage: 'Processing',
        actionTitle: 'Administrative Review',
        responsibleRole: 'REGIONAL_OFFICER',
        statutoryDeadline: app.slaDeadline,
        daysRemaining: daysLeft,
        isOverdue,
        blockingReasons: [],
        canExecute: true,
      };
  }
}

/**
 * Validate State Transition against statutory Approval Process Handbook prerequisites
 */
export function validateStateTransition(
  app: Application,
  targetStage: WorkflowStage,
  actorRole: Role
): { valid: boolean; message: string } {
  // Check role authorization
  const allowedRolesForStage: Record<WorkflowStage, Role[]> = {
    APPLICATION_SUBMITTED: ['INSTITUTION_REP', 'CENTRAL_ADMIN'],
    UNDER_SCRUTINY: ['REGIONAL_OFFICER', 'SCRUTINY_OFFICER', 'CENTRAL_ADMIN'],
    SCRUTINY_DEFICIENCY_RAISED: ['SCRUTINY_OFFICER', 'REGIONAL_OFFICER'],
    RE_SCRUTINY: ['INSTITUTION_REP', 'SCRUTINY_OFFICER'],
    SCRUTINY_CLEARED: ['SCRUTINY_OFFICER', 'REGIONAL_OFFICER'],
    EVC_QUEUED: ['REGIONAL_OFFICER', 'EVC_COORDINATOR'],
    EVC_SCHEDULED: ['EVC_COORDINATOR'],
    EVC_COMPLETED: ['EVC_COORDINATOR', 'REGIONAL_OFFICER'],
    SAC_SHC_REVIEW: ['CENTRAL_ADMIN', 'REGIONAL_OFFICER'],
    COUNCIL_DECISION_PENDING: ['CENTRAL_ADMIN'],
    APPROVED_WITH_UNDERTAKINGS: ['CENTRAL_ADMIN', 'REGIONAL_OFFICER'],
    APPROVED_UNCONDITIONAL: ['CENTRAL_ADMIN'],
    REJECTED: ['CENTRAL_ADMIN', 'REGIONAL_OFFICER'],
  };

  if (!allowedRolesForStage[targetStage]?.includes(actorRole) && actorRole !== 'CENTRAL_ADMIN') {
    return {
      valid: false,
      message: `Statutory Security Exception: Role '${actorRole}' is not authorized to transition docket to '${targetStage}' under Rule APH 2.4.`,
    };
  }

  // Check stage specific prerequisites
  if (targetStage === 'SCRUTINY_CLEARED') {
    const hasUnresolved = app.deficiencies.some(d => !d.resolved && d.severity === 'CRITICAL');
    if (hasUnresolved) {
      return {
        valid: false,
        message: 'Prerequisite Failure: Cannot clear Scrutiny while Critical Deficiencies remain unresolved.',
      };
    }
    if (!app.trustDeedValid || !app.fireNocValid) {
      return {
        valid: false,
        message: 'Mandatory Document Prerequisite: Trust Deed and Fire Safety NOC must be validated.',
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
 * Audit Hash Integrity Checker
 * Verifies that the cryptographic SHA-256 chain has zero broken links.
 */
export async function verifyAuditLedgerIntegrity(records: CryptographicAuditRecord[]): Promise<{
  isChainValid: boolean;
  brokenBlockIndex: number | null;
  message: string;
}> {
  if (records.length === 0) {
    return { isChainValid: true, brokenBlockIndex: null, message: 'Ledger is empty.' };
  }

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    
    // Check genesis block previous hash
    if (i === 0) {
      if (rec.previousHash !== 'GENESIS_BLOCK_AICTE_ONEFLOW_00000000000000000000000000000000') {
        return {
          isChainValid: false,
          brokenBlockIndex: 0,
          message: 'Genesis block previous hash tampering detected.',
        };
      }
    } else {
      // Check link to previous block
      if (rec.previousHash !== records[i - 1].currentHash) {
        return {
          isChainValid: false,
          brokenBlockIndex: i,
          message: `Hash link mismatch at block #${rec.blockHeight}. Chain integrity broken.`,
        };
      }
    }

    // Recompute current hash
    const payload = `${rec.blockHeight}|${rec.timestamp}|${rec.actorId}|${rec.actionType}|${rec.docketNumber}|${rec.previousStage}|${rec.newStage}|${rec.previousHash}`;
    const calculatedHash = await computeSha256(payload);

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
    message: `All ${records.length} audit blocks verified cryptographically. Zero tampering detected.`,
  };
}
