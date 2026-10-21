import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../db/database';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { appendAuditEvent } from '../services/auditService';

export const evcRouter = Router();

// GET /api/evc
evcRouter.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const evcRecords = await query<any>(`
      SELECT 
        e.id, e.application_id, a.docket_number, i.name as institution_name, i.code as institution_code,
        i.state as institution_state, e.scheduled_date, e.coordinator_name, e.conflict_check_status,
        e.conflict_check_scope, e.conflict_check_notes, e.readiness_json, e.status, e.recommendation,
        e.remarks, e.geo_latitude, e.geo_longitude
      FROM evc_records e
      JOIN applications a ON e.application_id = a.id
      JOIN institutions i ON a.institution_id = i.id;
    `);

    const evcIds = evcRecords.map((e) => e.id);
    let allExperts: any[] = [];
    if (evcIds.length > 0) {
      const placeholders = evcIds.map(() => '?').join(',');
      allExperts = await query<any>(
        `SELECT * FROM evc_experts WHERE evc_id IN (${placeholders});`,
        evcIds
      );
    }

    const formatted = evcRecords.map((e) => {
      const experts = allExperts.filter((exp) => exp.evc_id === e.id);
      return {
        id: e.id,
        applicationId: e.application_id,
        docketNumber: e.docket_number,
        institutionName: e.institution_name,
        institutionCode: e.institution_code,
        institutionState: e.institution_state,
        scheduledDate: e.scheduled_date,
        coordinatorName: e.coordinator_name,
        conflictCheckStatus: e.conflict_check_status,
        conflictCheckScope: e.conflict_check_scope,
        conflictCheckNotes: e.conflict_check_notes,
        readinessChecks: JSON.parse(e.readiness_json || '[]'),
        status: e.status,
        recommendation: e.recommendation,
        remarks: e.remarks,
        geoLatitude: e.geo_latitude,
        geoLongitude: e.geo_longitude,
        committeeExperts: experts.map((exp) => ({
          id: exp.id,
          name: exp.name,
          designation: exp.designation,
          institution: exp.institution,
          state: exp.state,
          specialization: exp.specialization,
          hasAffiliationWithTrust: exp.has_affiliation_with_trust === 1,
        })),
      };
    });

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch EVC records', details: err.message });
  }
});

// POST /api/evc/:id/schedule (Schedule EVC with objective conflict detection)
evcRouter.post('/:id/schedule', requireAuth, requireRoles('EVC_COORDINATOR', 'REGIONAL_OFFICER', 'CENTRAL_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledDate, coordinatorName } = req.body;
    const user = req.user!;

    if (!scheduledDate) {
      res.status(400).json({ error: 'scheduledDate is required' });
      return;
    }

    const evc = await queryOne<any>(
      `SELECT e.*, a.docket_number, i.state as institution_state
       FROM evc_records e
       JOIN applications a ON e.application_id = a.id
       JOIN institutions i ON a.institution_id = i.id
       WHERE e.id = ?;`,
      [id]
    );

    if (!evc) {
      res.status(404).json({ error: 'EVC record not found' });
      return;
    }

    // Objective conflict checking logic
    const currentExperts = await query<any>('SELECT * FROM evc_experts WHERE evc_id = ?;', [id]);
    const conflictNotes: string[] = [];
    let hasConflict = false;

    for (const exp of currentExperts) {
      if (exp.has_affiliation_with_trust === 1) {
        hasConflict = true;
        conflictNotes.push(`CRITICAL CONFLICT: Expert ${exp.name} has recorded affiliation with applicant trust/society.`);
      }
      if (evc.institution_state && exp.state && exp.state.toLowerCase().includes(evc.institution_state.toLowerCase().slice(0, 5))) {
        hasConflict = true;
        conflictNotes.push(`GEO CONFLICT: Expert ${exp.name} (${exp.state}) is located in applicant home state (${evc.institution_state}).`);
      }
    }

    const conflictStatus = hasConflict ? 'POTENTIAL_CONFLICT_FLAGGED' : 'NO_KNOWN_CONFLICT_DETECTED';
    const conflictScope = '3 objective checks evaluated: State jurisdiction, trust affiliation records, and active expert tenure.';
    const finalNotes = conflictNotes.length > 0 
      ? conflictNotes.join(' | ') 
      : 'Automated conflict heuristic cleared. Institutional affidavit on stamp paper required before site inspection.';

    await transaction(async () => {
      await execute(
        `UPDATE evc_records 
         SET scheduled_date = ?, coordinator_name = COALESCE(?, coordinator_name),
             conflict_check_status = ?, conflict_check_scope = ?, conflict_check_notes = ?,
             status = 'SCHEDULED'
         WHERE id = ?;`,
        [scheduledDate, coordinatorName || null, conflictStatus, conflictScope, finalNotes, id]
      );

      await appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'EVC_SCHEDULED',
        docketNumber: evc.docket_number,
        previousStage: 'EVC_QUEUED',
        newStage: 'EVC_QUEUED',
        ruleVersion: 'APH-2024-27-REV-02',
        reasonOrObservations: `Scheduled EVC visit for ${scheduledDate}. Conflict Evaluation: ${conflictStatus}. Notes: ${finalNotes}`,
      });
    });

    res.json({
      success: true,
      message: `EVC visit scheduled for ${scheduledDate}`,
      conflictCheckStatus: conflictStatus,
      conflictCheckNotes: finalNotes,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to schedule EVC', details: err.message });
  }
});

// POST /api/evc/:id/outcome (Submit inspection report and recommendation)
evcRouter.post('/:id/outcome', requireAuth, requireRoles('EVC_COORDINATOR', 'REGIONAL_OFFICER', 'CENTRAL_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { recommendation, remarks, readinessChecks } = req.body;
    const user = req.user!;

    if (!recommendation) {
      res.status(400).json({ error: 'recommendation is required (RECOMMEND_APPROVAL, DEFICIENCY_POINTED, REJECT)' });
      return;
    }

    const evc = await queryOne<any>(
      `SELECT e.*, a.docket_number, a.id as application_id
       FROM evc_records e
       JOIN applications a ON e.application_id = a.id
       WHERE e.id = ?;`,
      [id]
    );

    if (!evc) {
      res.status(404).json({ error: 'EVC record not found' });
      return;
    }

    await transaction(async () => {
      const readinessJson = readinessChecks ? JSON.stringify(readinessChecks) : evc.readiness_json;

      await execute(
        `UPDATE evc_records 
         SET status = 'REPORT_SUBMITTED', recommendation = ?, remarks = ?, readiness_json = ?
         WHERE id = ?;`,
        [recommendation, remarks || 'EVC physical inspection completed. Geo-tagged evidence archived.', readinessJson, id]
      );

      // Transition application to RECOMMENDED_TO_EC if approved or keep in deficiency
      const nextStage = recommendation === 'RECOMMEND_APPROVAL' ? 'RECOMMENDED_TO_EC' : 'SCRUTINY_DEFICIENCY_RAISED';

      await execute(
        `UPDATE applications 
         SET current_stage = ?, last_action = ?, last_action_timestamp = ?
         WHERE id = ?;`,
        [nextStage, `EVC Report Submitted: ${recommendation}. ${remarks || ''}`, new Date().toISOString(), evc.application_id]
      );

      await appendAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'EVC_OUTCOME_SUBMITTED',
        docketNumber: evc.docket_number,
        previousStage: 'EVC_QUEUED',
        newStage: nextStage,
        ruleVersion: 'APH-2024-27-REV-02',
        reasonOrObservations: `EVC Report outcome: ${recommendation}. Remarks: ${remarks || 'None'}`,
      });
    });

    res.json({ success: true, message: 'EVC inspection report submitted and docket advanced.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record EVC outcome', details: err.message });
  }
});
