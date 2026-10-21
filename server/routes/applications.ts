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

// Compute Explainable Next Action Ledger server-side
function calculateNextAction(app: ApplicationRow, deficiencies: DeficiencyRow[]) {
  const unresolvedDeficiencies = deficiencies.filter((d) => d.resolved === 0);

  switch (app.current_stage) {
    case 'SUBMITTED':
      return {
        nextAction: 'Initiate Scrutiny Verification',
        why: 'Docket submitted by institution requires formal verification of land deeds, fire NOC, and building approval against APH norms.',
        responsibleRole: 'SCRUTINY_OFFICER',
        assignedOfficer: app.assigned_officer,
        deadline: app.sla_deadline,
        deadlineType: app.deadline_type,
        deadlineCalculationBasis: app.deadline_calculation_basis,
        ruleSource: 'RULE-APH-SCRUTINY-01 (APH Ch. II, Cl. 2.3.1)',
        ruleVersion: app.rule_version,
        missingPrerequisites: [],
        permittedNextStages: ['UNDER_SCRUTINY', 'RETURNED_FOR_DEFICIENCY'],
      };

    case 'UNDER_SCRUTINY':
      if (unresolvedDeficiencies.length > 0) {
        return {
          nextAction: 'Issue Formal Form 17 Deficiency Memo',
          why: `Scrutiny Committee flagged ${unresolvedDeficiencies.length} statutory deficiency(ies). Application must be returned for institutional cure.`,
          responsibleRole: 'SCRUTINY_OFFICER',
          assignedOfficer: app.assigned_officer,
          deadline: app.sla_deadline,
          deadlineType: 'STATUTORY_MANDATE',
          deadlineCalculationBasis: '10 calendar days rectification window as per APH Clause 2.4(a)',
          ruleSource: 'RULE-APH-DEFICIENCY-02 (APH Ch. II, Cl. 2.4(a))',
          ruleVersion: app.rule_version,
          missingPrerequisites: unresolvedDeficiencies.map((d) => `${d.clause}: ${d.description}`),
          permittedNextStages: ['SCRUTINY_DEFICIENCY_RAISED'],
        };
      }
      return {
        nextAction: 'Recommend Clearance to Regional Committee',
        why: 'All statutory title deeds, NOCs, and cadral ratios comply with Approval Process Handbook requirements without active deficiencies.',
        responsibleRole: 'SCRUTINY_OFFICER',
        assignedOfficer: app.assigned_officer,
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: '14 calendar days from docket intake',
        ruleSource: 'RULE-APH-SCRUTINY-01 (APH Ch. II, Cl. 2.3.1)',
        ruleVersion: app.rule_version,
        missingPrerequisites: [],
        permittedNextStages: ['SCRUTINY_CLEARED', 'SCRUTINY_DEFICIENCY_RAISED'],
      };

    case 'SCRUTINY_DEFICIENCY_RAISED':
      return {
        nextAction: 'Upload Rectification Evidence & Supporting Documents',
        why: 'Institution representative must submit rectified documentation for pointed deficiencies before the statutory 10-day window expires.',
        responsibleRole: 'INSTITUTION_REP',
        assignedOfficer: 'Institution Nodal Officer',
        deadline: app.sla_deadline,
        deadlineType: 'STATUTORY_MANDATE',
        deadlineCalculationBasis: 'Statutory 10 calendar days curing window (APH Cl. 2.4)',
        ruleSource: 'RULE-APH-DEFICIENCY-02 (APH Ch. II, Cl. 2.4(a))',
        ruleVersion: app.rule_version,
        missingPrerequisites: unresolvedDeficiencies.map((d) => `Awaiting institution fix: ${d.description}`),
        permittedNextStages: ['UNDER_SCRUTINY'],
      };

    case 'SCRUTINY_CLEARED':
      return {
        nextAction: 'Dispatch Expert Visit Committee (EVC) or Advance to EC Review',
        why: 'Document scrutiny successfully passed. Regional Committee must either schedule physical/virtual EVC or submit direct recommendations to Executive Committee.',
        responsibleRole: 'REGIONAL_OFFICER',
        assignedOfficer: 'Regional Officer / EVC Desk',
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: '10 days allocation buffer following scrutiny clearance',
        ruleSource: 'RULE-APH-EVC-03 (APH Ch. II, Cl. 2.5)',
        ruleVersion: app.rule_version,
        missingPrerequisites: [],
        permittedNextStages: ['EVC_QUEUED', 'RECOMMENDED_TO_EC'],
      };

    case 'EVC_QUEUED':
      return {
        nextAction: 'Conduct Multi-Expert Inspection & Submit Objective Evaluation Report',
        why: 'EVC committee constituted. Experts must conduct physical or virtual verification of infrastructure, labs, and faculty presence.',
        responsibleRole: 'EVC_COORDINATOR',
        assignedOfficer: 'EVC Desk Coordinator',
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: '10 calendar days inspection target window',
        ruleSource: 'RULE-APH-EVC-03 (APH Ch. II, Cl. 2.5)',
        ruleVersion: app.rule_version,
        missingPrerequisites: [],
        permittedNextStages: ['RECOMMENDED_TO_EC', 'REJECTED_DEFICIENCY'],
      };

    case 'RECOMMENDED_TO_EC':
      return {
        nextAction: 'Executive Committee Statutory Approval Determination',
        why: 'Scrutiny and EVC clearance completed. Final statutory grant of Approval (LoA/EoA) or Rejection by Executive Committee.',
        responsibleRole: 'CENTRAL_ADMIN',
        assignedOfficer: 'AICTE Executive Committee / Member Secretary',
        deadline: app.sla_deadline,
        deadlineType: 'STATUTORY_MANDATE',
        deadlineCalculationBasis: 'APH statutory final determination timeline (APH Clause 2.7)',
        ruleSource: 'RULE-APH-SAC-APPEAL-04 (APH Ch. II, Cl. 2.7)',
        ruleVersion: app.rule_version,
        missingPrerequisites: [],
        permittedNextStages: ['APPROVED', 'REJECTED_DEFICIENCY', 'SAC_SHC_REVIEW'],
      };

    case 'APPROVED':
      return {
        nextAction: 'Monitor Post-Approval Compliance & Renewal Radars',
        why: 'Statutory approval issued. Continuous tracking of land lease, building stability, fire NOC, and cadre compliance undertakings is now active.',
        responsibleRole: 'CENTRAL_ADMIN',
        assignedOfficer: 'Compliance Bureau Desk',
        deadline: 'Active Monitoring Cycle',
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: 'Continuous compliance tracking under Chapter VII',
        ruleSource: 'RULE-APH-UNDERTAKINGS-05 (APH Ch. VII, Cl. 7.1)',
        ruleVersion: app.rule_version,
        missingPrerequisites: [],
        permittedNextStages: [],
      };

    case 'REJECTED_DEFICIENCY':
      return {
        nextAction: 'File Statutory Appeal to Standing Appellate Committee (SAC)',
        why: 'Statutory grant declined due to uncured deficiencies. Institution may invoke statutory appeal within 15 calendar days.',
        responsibleRole: 'INSTITUTION_REP',
        assignedOfficer: 'Institution Legal Counsel / Registrar',
        deadline: app.sla_deadline,
        deadlineType: 'STATUTORY_MANDATE',
        deadlineCalculationBasis: 'Statutory 15-day appellate limitation period (APH Clause 2.8)',
        ruleSource: 'RULE-APH-SAC-APPEAL-04 (APH Ch. II, Cl. 2.8)',
        ruleVersion: app.rule_version,
        missingPrerequisites: ['Contested grounds of appeal with evidence required'],
        permittedNextStages: ['SAC_SHC_REVIEW'],
      };

    case 'SAC_SHC_REVIEW':
      return {
        nextAction: 'Standing Appellate Committee Quasi-Judicial Hearing',
        why: 'Appellate hearing conducted before retired High Court Judge / Senior Academician panel. Review of contested grounds.',
        responsibleRole: 'CENTRAL_ADMIN',
        assignedOfficer: 'SAC Chairman & Member Secretary',
        deadline: app.sla_deadline,
        deadlineType: 'STATUTORY_MANDATE',
        deadlineCalculationBasis: 'Statutory 15-day appellate disposal mandate',
        ruleSource: 'RULE-APH-SAC-APPEAL-04 (APH Ch. II, Cl. 2.8)',
        ruleVersion: app.rule_version,
        missingPrerequisites: [],
        permittedNextStages: ['APPROVED', 'REJECTED_DEFICIENCY'],
      };

    default:
      return {
        nextAction: 'Administrative Review',
        why: `Application is in stage ${app.current_stage}.`,
        responsibleRole: 'CENTRAL_ADMIN',
        assignedOfficer: 'Bureau Officer',
        deadline: app.sla_deadline,
        deadlineType: 'INTERNAL_SERVICE_TARGET',
        deadlineCalculationBasis: 'Standard queue processing',
        ruleSource: 'RULE-APH-SCRUTINY-01',
        ruleVersion: app.rule_version,
        missingPrerequisites: [],
        permittedNextStages: [],
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
    if (user.role === 'INSTITUTION_REP') {
      if (app.current_stage !== 'SCRUTINY_DEFICIENCY_RAISED' || targetStage !== 'UNDER_SCRUTINY') {
        res.status(403).json({
          error: 'Access Denied: Institutional Representative may only resubmit dockets when cures have been uploaded.',
        });
        return;
      }
    }

    if (user.role === 'SCRUTINY_OFFICER') {
      const allowedTarget = ['UNDER_SCRUTINY', 'SCRUTINY_CLEARED', 'SCRUTINY_DEFICIENCY_RAISED'];
      if (!allowedTarget.includes(targetStage)) {
        res.status(403).json({
          error: `Access Denied: Scrutiny Officer cannot transition docket to '${targetStage}'. Permitted: ${allowedTarget.join(', ')}`,
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
      if (app.fireNocValid === 0 || app.fire_noc_valid === 0) {
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

    // Execute state transition atomically inside transaction
    const finalRuleVersion = ruleVersion || app.rule_version || 'APH-2024-27-REV-02';
    const nowIso = new Date().toISOString();
    const actionDesc = observations || `Transitioned from ${app.current_stage} to ${targetStage} by ${user.name} (${user.role})`;

    const updatedApp = await transaction(async () => {
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
    res.status(500).json({ error: 'Transition failed', details: err.message });
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
