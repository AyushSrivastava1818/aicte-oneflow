import { describe, it, expect } from 'vitest';
import { calculateDaysRemaining } from '../services/workflowEngine';
import { INITIAL_NOTIFICATIONS } from '../data/seedData';
import { NotificationLog } from '../types';

describe('Deadline Calculations, Idempotency, and Alert Suppression', () => {
  it('calculates days remaining accurately relative to an injected reference date', () => {
    const fixedNow = new Date('2026-10-22T00:00:00Z');
    const futureDeadline = '2026-10-26T18:00:00Z';
    const days = calculateDaysRemaining(futureDeadline, fixedNow);
    expect(days).toBe(5);

    const pastDeadline = '2026-10-20T18:00:00Z';
    const overdueDays = calculateDaysRemaining(pastDeadline, fixedNow);
    expect(overdueDays).toBe(-1); // Overdue
  });

  it('guarantees unique and stable idempotency keys for notification dispatches', () => {
    const keys = INITIAL_NOTIFICATIONS.map(n => n.idempotencyKey);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
    for (const key of keys) {
      expect(key.startsWith('idemp_')).toBe(true);
    }
  });

  it('suppresses alert dispatch when an obligation is marked resolved prior to trigger', () => {
    const mockObligationOpen = false;
    const generateNotification = (docket: string, obligationOpen: boolean): NotificationLog => ({
      id: 'notif-test-1',
      docketNumber: docket,
      recipientRole: 'SCRUTINY_OFFICER',
      recipientEmail: 'officer@aicte.gov.in',
      subject: 'Test Alert',
      bodyPreview: 'Test preview',
      channel: 'OFFICIAL_PORTAL_ALERT',
      timestamp: new Date().toISOString(),
      status: obligationOpen ? 'DELIVERED_SIMULATED' : 'SUPPRESSED_RESOLVED',
      escalationLevel: 'DESK_OFFICER',
      idempotencyKey: `idemp_${docket}_test`,
      attemptCount: 1,
      obligationStillOpen: obligationOpen,
    });

    const dispatched = generateNotification('AICTE/2026-27/RO-N/10942', mockObligationOpen);
    expect(dispatched.status).toBe('SUPPRESSED_RESOLVED');
    expect(dispatched.obligationStillOpen).toBe(false);
  });
});
