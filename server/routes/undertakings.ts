import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../db/database';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { appendAuditEvent } from '../services/auditService';

export const undertakingsRouter = Router();

// GET /api/undertakings
undertakingsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    let sqlStr = `
      SELECT 
        u.id, u.application_id, a.docket_number, i.name as institution_name, i.code as institution_code,
        i.region, u.title, u.statutory_condition, u.aph_clause, u.provenance, u.issued_date,
        u.due_date, u.deadline_type, u.status, u.evidence_doc_name, u.evidence_doc_size,
        u.submitted_at, u.verified_by, u.verified_at, u.verification_notes, u.escalation_level
      FROM undertakings u
      JOIN applications a ON u.application_id = a.id
      JOIN institutions i ON u.institution_id = i.id
    `;
    const params: any[] = [];

    if (user.role === 'REGIONAL_OFFICER' && user.regionScope) {
      sqlStr += ' WHERE i.region = ?';
      params.push(user.regionScope);
    } else if (user.role === 'INSTITUTION_REP' && user.institutionId) {
      sqlStr += ' WHERE u.institution_id = ?';
      params.push(user.institutionId);
    }

    sqlStr += ' ORDER BY u.due_date ASC;';

    const rows = await query<any>(sqlStr, params);

    const formatted = rows.map((r) => ({
      id: r.id,
      applicationId: r.application_id,
      docketNumber: r.docket_number,
      institutionName: r.institution_name,
      institutionCode: r.institution_code,
      title: r.title,
      statutoryCondition: r.statutory_condition,
      aphClause: r.aph_clause,
      provenance: r.provenance,
      issuedDate: r.issued_date,
      dueDate: r.due_date,
      deadlineType: r.deadline_type,
      status: r.status,
      evidenceDocName: r.evidence_doc_name,
      evidenceDocSize: r.evidence_doc_size,
      submittedAt: r.submitted_at,
      verifiedBy: r.verified_by,
      verifiedAt: r.verified_at,
      verificationNotes: r.verification_notes,
      escalationLevel: r.escalation_level,
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch undertakings', details: err.message });
  }
});

// POST /api/undertakings/:id/upload (Institution uploads evidence — SUBMISSION != COMPLIANCE)
undertakingsRouter.post('/:id/upload', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { evidenceDocName, evidenceDocSize } = req.body;
    const user = req.user!;

    const und = await queryOne<any>(
      `SELECT u.*, a.docket_number 
       FROM undertakings u
       JOIN applications a ON u.application_id = a.id
       WHERE u.id = ?;`,
      [id]
    );

    if (!und) {
      res.status(404).json({ error: 'Undertaking record not found' });
      return;
    }

    if (user.role === 'INSTITUTION_REP' && user.institutionId && und.institution_id !== user.institutionId) {
      res.status(403).json({ error: 'Access Denied: Cannot upload evidence for foreign institution' });
      return;
    }

    const docName = evidenceDocName || `Signed_Affidavit_${und.docket_number}.pdf`;
    const docSize = evidenceDocSize || '1.8 MB';
    const submittedAt = new Date().toISOString();

    await transaction(async () => {
      await execute(
        `UPDATE undertakings 
         SET status = 'SUBMITTED_UNDER_REVIEW', evidence_doc_name = ?, evidence_doc_size = ?, submitted_at = ?
         WHERE id = ?;`,
        [docName, docSize, submittedAt, id]
      );

      await appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'UNDERTAKING_EVIDENCE_SUBMITTED',
        docketNumber: und.docket_number,
        previousStage: 'N/A',
        newStage: 'N/A',
        ruleVersion: und.provenance,
        reasonOrObservations: `Uploaded evidence '${docName}' (${docSize}) for undertaking '${und.title}'. Status is SUBMITTED_UNDER_REVIEW pending bureau verification.`,
      });
    });

    res.json({
      success: true,
      message: `Evidence document '${docName}' registered. Note: Submission does not imply compliance until verified by Bureau.`,
      status: 'SUBMITTED_UNDER_REVIEW',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record evidence upload', details: err.message });
  }
});

// POST /api/undertakings/:id/verify (Bureau officer verifies compliance or returns for correction)
undertakingsRouter.post('/:id/verify', requireAuth, requireRoles('REGIONAL_OFFICER', 'CENTRAL_ADMIN', 'SCRUTINY_OFFICER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, verificationNotes } = req.body; // action: 'APPROVE' | 'RETURN'
    const user = req.user!;

    if (!action || !['APPROVE', 'RETURN'].includes(action)) {
      res.status(400).json({ error: "Action must be 'APPROVE' or 'RETURN'" });
      return;
    }

    const und = await queryOne<any>(
      `SELECT u.*, a.docket_number 
       FROM undertakings u
       JOIN applications a ON u.application_id = a.id
       WHERE u.id = ?;`,
      [id]
    );

    if (!und) {
      res.status(404).json({ error: 'Undertaking record not found' });
      return;
    }

    const newStatus = action === 'APPROVE' ? 'VERIFIED_COMPLIANT' : 'RETURNED_FOR_CORRECTION';
    const verifiedAt = new Date().toISOString();

    await transaction(async () => {
      await execute(
        `UPDATE undertakings 
         SET status = ?, verified_by = ?, verified_at = ?, verification_notes = ?
         WHERE id = ?;`,
        [newStatus, `${user.name} (${user.role})`, verifiedAt, verificationNotes || null, id]
      );

      // Check if any open undertakings remain for this application
      const openUndertakings = await query<any>(
        "SELECT id FROM undertakings WHERE application_id = ? AND status != 'VERIFIED_COMPLIANT';",
        [und.application_id]
      );

      await execute(
        'UPDATE applications SET has_pending_undertakings = ? WHERE id = ?;',
        [openUndertakings.length > 0 ? 1 : 0, und.application_id]
      );

      await appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: action === 'APPROVE' ? 'UNDERTAKING_VERIFIED' : 'UNDERTAKING_RETURNED',
        docketNumber: und.docket_number,
        previousStage: 'N/A',
        newStage: 'N/A',
        ruleVersion: und.provenance,
        reasonOrObservations: `Undertaking '${und.title}' marked as ${newStatus}. Notes: ${verificationNotes || 'None'}`,
      });
    });

    res.json({
      success: true,
      message: `Undertaking updated to ${newStatus}.`,
      status: newStatus,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify undertaking', details: err.message });
  }
});
