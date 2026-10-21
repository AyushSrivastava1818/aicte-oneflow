import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../db/database';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { appendAuditEvent } from '../services/auditService';

export const documentsRouter = Router();

// GET /api/documents
documentsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    let sqlStr = `
      SELECT 
        d.id, d.institution_id, i.name as institution_name, i.code as institution_code,
        i.region, d.doc_type, d.document_number, d.issued_by_authority, d.issue_date,
        d.expiry_date, d.days_remaining, d.status, d.ocr_json, d.file_size, d.last_renewed_date
      FROM prescribed_documents d
      JOIN institutions i ON d.institution_id = i.id
    `;
    const params: any[] = [];

    if (user.role === 'REGIONAL_OFFICER' && user.regionScope) {
      sqlStr += ' WHERE i.region = ?';
      params.push(user.regionScope);
    } else if (user.role === 'INSTITUTION_REP' && user.institutionId) {
      sqlStr += ' WHERE d.institution_id = ?';
      params.push(user.institutionId);
    }

    sqlStr += ' ORDER BY d.days_remaining ASC;';

    const rows = await query<any>(sqlStr, params);

    const formatted = rows.map((r) => ({
      id: r.id,
      institutionId: r.institution_id,
      institutionName: r.institution_name,
      institutionCode: r.institution_code,
      docType: r.doc_type,
      documentNumber: r.document_number,
      issuedByAuthority: r.issued_by_authority,
      issueDate: r.issue_date,
      expiryDate: r.expiry_date,
      daysRemaining: r.days_remaining,
      status: r.status,
      ocrExtraction: JSON.parse(r.ocr_json || '{}'),
      fileSize: r.file_size,
      lastRenewedDate: r.last_renewed_date,
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch prescribed documents', details: err.message });
  }
});

// POST /api/documents/:id/confirm-ocr (Human-confirmation of candidate OCR extraction)
documentsRouter.post('/:id/confirm-ocr', requireAuth, requireRoles('SCRUTINY_OFFICER', 'REGIONAL_OFFICER', 'CENTRAL_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { confirmedIssueDate, confirmedExpiryDate, notes } = req.body;
    const user = req.user!;

    const doc = await queryOne<any>(
      `SELECT d.*, i.name as institution_name 
       FROM prescribed_documents d
       JOIN institutions i ON d.institution_id = i.id
       WHERE d.id = ?;`,
      [id]
    );

    if (!doc) {
      res.status(404).json({ error: 'Prescribed document not found' });
      return;
    }

    const currentOcr = JSON.parse(doc.ocr_json || '{}');
    const updatedOcr = {
      ...currentOcr,
      isHumanVerified: true,
      verifiedBy: `${user.name} (${user.role})`,
      verifiedAt: new Date().toISOString(),
      verificationNotes: notes || 'Reviewed and confirmed against official authority stamp.',
    };

    const finalIssueDate = confirmedIssueDate || doc.issue_date;
    const finalExpiryDate = confirmedExpiryDate || doc.expiry_date;

    // Recalculate days remaining
    const diffTime = new Date(finalExpiryDate).getTime() - Date.now();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let status = doc.status;
    if (daysRemaining < 0) {
      status = 'CRITICALLY_EXPIRED';
    } else if (daysRemaining <= 60) {
      status = 'EXPIRING_SOON';
    } else {
      status = 'VALID';
    }

    await transaction(async () => {
      await execute(
        `UPDATE prescribed_documents 
         SET issue_date = ?, expiry_date = ?, days_remaining = ?, status = ?, ocr_json = ?
         WHERE id = ?;`,
        [finalIssueDate, finalExpiryDate, daysRemaining, status, JSON.stringify(updatedOcr), id]
      );

      await appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'DOCUMENT_OCR_VERIFIED',
        docketNumber: doc.document_number,
        previousStage: 'N/A',
        newStage: 'N/A',
        ruleVersion: 'RULE-APH-RADAR-06',
        reasonOrObservations: `Officer verified OCR candidate extraction for ${doc.doc_type} (${doc.document_number}). Expiry date locked to ${finalExpiryDate}.`,
      });
    });

    res.json({
      success: true,
      message: 'Candidate OCR extraction confirmed by human authority.',
      doc: {
        id,
        issueDate: finalIssueDate,
        expiryDate: finalExpiryDate,
        daysRemaining,
        status,
        ocrExtraction: updatedOcr,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to confirm OCR extraction', details: err.message });
  }
});

// POST /api/documents/:id/renew (Upload renewal document)
documentsRouter.post('/:id/renew', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newExpiryDate, newDocumentNumber, authority } = req.body;
    const user = req.user!;

    const doc = await queryOne<any>('SELECT * FROM prescribed_documents WHERE id = ?;', [id]);
    if (!doc) {
      res.status(404).json({ error: 'Prescribed document not found' });
      return;
    }

    if (user.role === 'INSTITUTION_REP' && user.institutionId && doc.institution_id !== user.institutionId) {
      res.status(403).json({ error: 'Access Denied: Cannot renew document for foreign institution' });
      return;
    }

    const expiry = newExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const diffTime = new Date(expiry).getTime() - Date.now();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const nowIso = new Date().toISOString();

    await transaction(async () => {
      await execute(
        `UPDATE prescribed_documents 
         SET expiry_date = ?, document_number = COALESCE(?, document_number),
             issued_by_authority = COALESCE(?, issued_by_authority),
             days_remaining = ?, status = 'VALID', last_renewed_date = ?
         WHERE id = ?;`,
        [expiry, newDocumentNumber || null, authority || null, daysRemaining, nowIso, id]
      );

      await appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'DOCUMENT_RENEWAL_LOGGED',
        docketNumber: doc.document_number,
        previousStage: 'N/A',
        newStage: 'N/A',
        ruleVersion: 'RULE-APH-RADAR-06',
        reasonOrObservations: `Renewal submitted for ${doc.doc_type}. New expiry: ${expiry} (${daysRemaining} days remaining).`,
      });
    });

    res.json({
      success: true,
      message: 'Document renewed successfully.',
      expiryDate: expiry,
      daysRemaining,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to renew document', details: err.message });
  }
});
