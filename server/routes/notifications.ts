import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../db/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await query<any>(
      'SELECT * FROM notifications ORDER BY timestamp DESC;'
    );

    const formatted = rows.map((r) => ({
      id: r.id,
      docketNumber: r.docket_number,
      recipientRole: r.recipient_role,
      recipientEmail: r.recipient_email,
      subject: r.subject,
      bodyPreview: r.body_preview,
      channel: r.channel,
      timestamp: r.timestamp,
      status: r.status,
      escalationLevel: r.escalation_level,
      idempotencyKey: r.idempotency_key,
      attemptCount: r.attempt_count,
      lastAttemptAt: r.last_attempt_at,
      obligationStillOpen: r.obligation_still_open === 1,
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

// POST /api/notifications/reconcile (Durable background reconciliation with idempotency and suppression)
notificationsRouter.post('/reconcile', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    let createdCount = 0;
    let suppressedCount = 0;

    await transaction(async () => {
      // 1. Check for resolved undertakings that have existing open notifications -> Suppress
      const resolvedUndertakings = await query<any>(
        "SELECT id, docket_number FROM undertakings u JOIN applications a ON u.application_id = a.id WHERE u.status = 'VERIFIED_COMPLIANT';"
      );

      for (const u of resolvedUndertakings) {
        const matchingNotifs = await query<any>(
          "SELECT id FROM notifications WHERE docket_number = ? AND obligation_still_open = 1;",
          [u.docket_number]
        );
        for (const n of matchingNotifs) {
          await execute(
            "UPDATE notifications SET obligation_still_open = 0, status = 'SUPPRESSED_RESOLVED' WHERE id = ?;",
            [n.id]
          );
          suppressedCount++;
        }
      }

      // 2. Check for overdue undertakings
      const overdueUndertakings = await query<any>(
        `SELECT u.*, a.docket_number, i.contact_email, i.name as institution_name
         FROM undertakings u
         JOIN applications a ON u.application_id = a.id
         JOIN institutions i ON u.institution_id = i.id
         WHERE u.status IN ('PENDING_SUBMISSION', 'RETURNED_FOR_CORRECTION')
         AND date(u.due_date) < date('now');`
      );

      for (const u of overdueUndertakings) {
        const idempKey = `IDEMP-ESC-L2-${u.id}-${u.due_date}`;
        const existing = await queryOne<any>(
          'SELECT id FROM notifications WHERE idempotency_key = ?;',
          [idempKey]
        );

        if (!existing) {
          const notifId = `notif-esc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await execute(
            `INSERT INTO notifications (
              id, docket_number, recipient_role, recipient_email, subject, body_preview,
              channel, timestamp, status, escalation_level, idempotency_key, attempt_count,
              last_attempt_at, obligation_still_open
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1);`,
            [
              notifId,
              u.docket_number,
              'REGIONAL_OFFICER',
              'ro.western@aicte.gov.in',
              `ESCALATION LEVEL 2: Breach of Statutory Deadline for ${u.title}`,
              `Statutory undertaking '${u.title}' for docket ${u.docket_number} is overdue past ${u.due_date}. Auto-escalating to Regional Officer.`,
              'EMAIL_SIMULATED',
              new Date().toISOString(),
              'SENT_SIMULATED',
              'LEVEL_2_RO',
              idempKey,
              new Date().toISOString(),
            ]
          );
          createdCount++;
        }
      }
    });

    res.json({
      success: true,
      message: 'Notification queue reconciled idempotently.',
      newAlertsCreated: createdCount,
      alertsSuppressed: suppressedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Reconciliation failed', details: err.message });
  }
});

// PUT /api/notifications/:id/acknowledge
notificationsRouter.put('/:id/acknowledge', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await execute("UPDATE notifications SET status = 'ACKNOWLEDGED' WHERE id = ?;", [id]);
    res.json({ success: true, message: 'Notification acknowledged' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to acknowledge notification', details: err.message });
  }
});
