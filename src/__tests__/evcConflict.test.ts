import { describe, it, expect } from 'vitest';
import { evaluateEVCConflictStatus } from '../services/workflowEngine';
import { CommitteeExpert } from '../types';

describe('EVC Peer Committee Conflict-of-Interest Evaluation', () => {
  const cleanExperts: CommitteeExpert[] = [
    {
      id: 'e1',
      name: 'Prof. K. R. Narayanan',
      designation: 'Senior Professor',
      institution: 'NIT Warangal',
      state: 'Telangana',
      specialization: 'Robotics',
      hasAffiliationWithTrust: false,
    },
    {
      id: 'e2',
      name: 'Dr. Sunita V. Rao',
      designation: 'Principal',
      institution: 'COEP Pune',
      state: 'Maharashtra',
      specialization: 'Architecture',
      hasAffiliationWithTrust: false,
    }
  ];

  it('returns NO_KNOWN_CONFLICT_DETECTED when experts are from different states and have zero affiliations', () => {
    const result = evaluateEVCConflictStatus(cleanExperts, 'Karnataka');
    expect(result.status).toBe('NO_KNOWN_CONFLICT_DETECTED');
    expect(result.scope).toBeDefined();
    expect(result.notes).toContain('No known conflicts detected within evaluated scope');
  });

  it('returns POTENTIAL_CONFLICT_REQUIRES_REVIEW when an expert originates from the same state', () => {
    // Applicant institution in Maharashtra, same as Dr. Sunita V. Rao
    const result = evaluateEVCConflictStatus(cleanExperts, 'Maharashtra');
    expect(result.status).toBe('POTENTIAL_CONFLICT_REQUIRES_REVIEW');
    expect(result.notes).toContain('Expert from same state as applicant institution');
  });

  it('returns CONFLICT_CONFIRMED when an expert has declared prior trust or governance ties', () => {
    const affiliatedExperts: CommitteeExpert[] = [
      ...cleanExperts,
      {
        id: 'e3',
        name: 'Dr. Trustee Member',
        designation: 'Former Dean',
        institution: 'Private Institute',
        state: 'Delhi',
        specialization: 'Management',
        hasAffiliationWithTrust: true,
      }
    ];

    const result = evaluateEVCConflictStatus(affiliatedExperts, 'Karnataka');
    expect(result.status).toBe('CONFLICT_CONFIRMED');
    expect(result.notes).toContain('Direct conflict detected');
  });

  it('returns CHECK_NOT_RUN when no committee experts have been empanelled', () => {
    const result = evaluateEVCConflictStatus([], 'Karnataka');
    expect(result.status).toBe('CHECK_NOT_RUN');
  });
});
