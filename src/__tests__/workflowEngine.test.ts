import { describe, it, expect } from 'vitest';
import { 
  validateStateTransition, 
  generateExplainableCaseAction, 
  evaluatePrerequisites 
} from '../services/workflowEngine';
import { INITIAL_APPLICATIONS } from '../data/seedData';

describe('AICTE Workflow Engine & Prerequisite Guards', () => {
  const appUnderScrutiny = INITIAL_APPLICATIONS[0]; // Apex Tech (Deficient Fire NOC, 2 Deficiencies)
  const appQueuedEVC = INITIAL_APPLICATIONS[2]; // Bangalore Robotics (Compliant)

  it('blocks clearing scrutiny if critical deficiencies or invalid fire NOC exist', () => {
    const result = validateStateTransition(appUnderScrutiny, 'SCRUTINY_CLEARED', 'SCRUTINY_OFFICER');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Prerequisite Failure');
    expect(result.blockers).toBeDefined();
    expect(result.blockers!.length).toBeGreaterThan(0);
  });

  it('rejects unauthorized role attempting state transition under APH rules', () => {
    // Institutional rep attempting to approve scrutiny cleared
    const result = validateStateTransition(appUnderScrutiny, 'SCRUTINY_CLEARED', 'INSTITUTION_REP');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Statutory Access Violation');
  });

  it('allows bureau scrutiny officer to record Form 17 deficiency memorandum', () => {
    const result = validateStateTransition(appUnderScrutiny, 'SCRUTINY_DEFICIENCY_RAISED', 'SCRUTINY_OFFICER');
    expect(result.valid).toBe(true);
  });

  it('enforces workflow sequence: cannot enter EVC Queue without Scrutiny Cleared stage', () => {
    const result = validateStateTransition(appUnderScrutiny, 'EVC_QUEUED', 'REGIONAL_OFFICER');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Workflow Sequence Violation');
  });

  it('generates an Explainable Case Action Ledger with deterministic owner and rule provenance', () => {
    const ledgerEntry = generateExplainableCaseAction(appUnderScrutiny);
    expect(ledgerEntry.caseId).toBe(appUnderScrutiny.id);
    expect(ledgerEntry.docketNumber).toBe(appUnderScrutiny.docketNumber);
    expect(ledgerEntry.responsibleRole).toBe('SCRUTINY_OFFICER');
    expect(ledgerEntry.actionRationale).toBeDefined();
    expect(ledgerEntry.regulatorySource.status).toBe('VERIFIED_SOURCE');
    expect(ledgerEntry.blockers.length).toBeGreaterThan(0);
    expect(ledgerEntry.prerequisites.length).toBeGreaterThanOrEqual(4);
  });

  it('evaluates prerequisites explicitly for a compliant application', () => {
    const prereqs = evaluatePrerequisites(appQueuedEVC);
    const unsatisfied = prereqs.filter(p => !p.satisfied);
    expect(unsatisfied.length).toBe(0);
  });
});
