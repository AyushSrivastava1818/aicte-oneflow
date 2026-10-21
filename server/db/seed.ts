import bcrypt from 'bcryptjs';
import { execute, resetDatabase, transaction } from './database';
import { INITIAL_APPLICATIONS, INITIAL_AUDIT_LOGS, INITIAL_DOCUMENTS, INITIAL_EVC_RECORDS, INITIAL_NOTIFICATIONS, INITIAL_UNDERTAKINGS } from '../../src/data/seedData';

export async function seedDatabase(): Promise<void> {
  await resetDatabase();

  await transaction(async () => {
    // 1. Seed Institutions
    const institutions = [
      { id: 'inst-01', code: '1-492817291', name: 'Apex Institute of Technology & AI', region: 'Northern', state: 'Uttar Pradesh (Noida)', address: 'Plot 12, Knowledge Park III, Greater Noida', email: 'registrar@apex.edu' },
      { id: 'inst-02', code: '1-382910482', name: 'Sardar Patel College of Engineering & Marine Tech', region: 'Western', state: 'Maharashtra (Navi Mumbai)', address: 'Sector 15, Belapur, Navi Mumbai', email: 'principal@spcemt.edu' },
      { id: 'inst-03', code: '1-849201948', name: 'Bangalore Institute of Robotics & Automation', region: 'South-Western', state: 'Karnataka (Bengaluru)', address: 'Sy. No. 118/2, Whitefield Industrial Area, Bengaluru', email: 'registrar@bira.edu' },
      { id: 'inst-04', code: '1-294819402', name: 'Kolkata Metropolitan Polytechnic Institute', region: 'Eastern', state: 'West Bengal (Kolkata)', address: 'Sector V, Salt Lake, Kolkata', email: 'director@kmpi.edu' },
      { id: 'inst-05', code: '1-938201948', name: 'Malwa School of Architecture & Urban Design', region: 'Central', state: 'Madhya Pradesh (Bhopal)', address: 'Khasra No. 204/1, Hoshangabad Road, Bhopal', email: 'dean@malwaarch.edu' },
      { id: 'inst-06', code: '1-103948572', name: 'Madras Academy of Aeronautical Sciences', region: 'Southern', state: 'Tamil Nadu (Chennai)', address: 'Velachery Main Road, Chennai', email: 'principal@maas.edu' },
    ];

    console.log('Seeding institutions...');
    for (const inst of institutions) {
      await execute(
        `INSERT INTO institutions (id, code, name, region, state, address, contact_email, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [inst.id, inst.code, inst.name, inst.region, inst.state, inst.address, inst.email, '2026-08-01T00:00:00Z']
      );
    }

    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash('Password@123', 10);
    const users = [
      { id: 'usr-admin-01', email: 'admin@aicte.gov.in', name: 'Member Secretary AICTE HQ', role: 'CENTRAL_ADMIN', regionScope: null, instId: null },
      { id: 'usr-ro-north', email: 'ro.north@aicte.gov.in', name: 'Regional Director (Northern)', role: 'REGIONAL_OFFICER', regionScope: 'Northern', instId: null },
      { id: 'usr-ro-west', email: 'ro.west@aicte.gov.in', name: 'Smt. Anjali Deshmukh (RO Western)', role: 'REGIONAL_OFFICER', regionScope: 'Western', instId: null },
      { id: 'usr-scrutiny-03', email: 'scrutiny.officer@aicte.gov.in', name: 'Dr. Rameshwar Nath (Bureau Desk 3)', role: 'SCRUTINY_OFFICER', regionScope: 'Northern', instId: null },
      { id: 'usr-evc-sw', email: 'evc.coord@aicte.gov.in', name: 'Shri B. K. Venkatesh (EVC Desk SW)', role: 'EVC_COORDINATOR', regionScope: 'South-Western', instId: null },
      { id: 'usr-rep-apex', email: 'registrar@apex.edu', name: 'Dr. Vivek Sharma (Registrar)', role: 'INSTITUTION_REP', regionScope: 'Northern', instId: 'inst-01' },
      { id: 'usr-rep-spc', email: 'principal@spcemt.edu', name: 'Prof. Suresh K. Patil (Principal)', role: 'INSTITUTION_REP', regionScope: 'Western', instId: 'inst-02' },
      { id: 'usr-auditor-01', email: 'auditor@cag.gov.in', name: 'Central Vigilance Directorate Auditor', role: 'STATUTORY_AUDITOR', regionScope: null, instId: null },
    ];

    for (const u of users) {
      await execute(
        `INSERT INTO users (id, email, password_hash, name, role, region_scope, institution_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [u.id, u.email, passwordHash, u.name, u.role, u.regionScope, u.instId, '2026-08-01T00:00:00Z']
      );
    }

    const instMap: Record<string, string> = {
      'Apex Institute of Technology & AI': 'inst-01',
      'Sardar Patel College of Engineering & Marine Tech': 'inst-02',
      'Bangalore Institute of Robotics & Automation': 'inst-03',
      'Kolkata Metropolitan Polytechnic Institute': 'inst-04',
      'Malwa School of Architecture & Urban Design': 'inst-05',
      'Madras Academy of Aeronautical Sciences': 'inst-06',
    };

    console.log('Seeding applications...');
    for (const app of INITIAL_APPLICATIONS) {
      const instId = instMap[app.institutionName] || 'inst-01';
      await execute(
        `INSERT INTO applications (
          id, docket_number, institution_id, academic_year, application_type, route,
          current_stage, rule_version, rule_provenance, submitted_at, sla_deadline,
          deadline_type, deadline_calculation_basis, assigned_officer, assigned_role,
          land_area_acres, carpet_area_sqm, cadre_ratio, trust_deed_valid, fire_noc_valid,
          building_plan_valid, has_pending_undertakings, last_action, last_action_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          app.id, app.docketNumber, instId, app.academicYear, app.applicationType, app.route,
          app.currentStage, app.ruleVersion, app.ruleProvenance, app.submittedAt, app.slaDeadline,
          app.deadlineType, app.deadlineCalculationBasis, app.assignedOfficer, app.assignedRole,
          app.landAreaAcres, app.carpetAreaSqM, app.cadreRatio, app.trustDeedValid ? 1 : 0,
          app.fireNocValid ? 1 : 0, app.buildingPlanValid ? 1 : 0, app.hasPendingUndertakings ? 1 : 0,
          app.lastAction, app.lastActionTimestamp
        ]
      );

      for (const def of app.deficiencies) {
        await execute(
          `INSERT INTO deficiencies (id, application_id, clause, description, severity, raised_by, raised_at, resolved, resolution_note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [def.id, app.id, def.clause, def.description, def.severity, def.raisedBy, def.raisedAt, def.resolved ? 1 : 0, def.resolutionNote || null]
        );
      }
    }

    console.log('Seeding EVC...');
    for (const evc of INITIAL_EVC_RECORDS) {
      await execute(
        `INSERT INTO evc_records (
          id, application_id, scheduled_date, coordinator_name, conflict_check_status,
          conflict_check_scope, conflict_check_notes, readiness_json, status, recommendation,
          remarks, geo_latitude, geo_longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          evc.id, evc.applicationId, evc.scheduledDate, evc.coordinatorName, evc.conflictCheckStatus,
          evc.conflictCheckScope, evc.conflictCheckNotes || null, JSON.stringify(evc.readinessChecks),
          evc.status, evc.recommendation || null, evc.remarks || null, evc.geoLatitude || null, evc.geoLongitude || null
        ]
      );

      for (const exp of evc.committeeExperts) {
        await execute(
          `INSERT INTO evc_experts (id, evc_id, name, designation, institution, state, specialization, has_affiliation_with_trust)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [exp.id, evc.id, exp.name, exp.designation, exp.institution, exp.state, exp.specialization, exp.hasAffiliationWithTrust ? 1 : 0]
        );
      }
    }

    console.log('Seeding undertakings...');
    for (const und of INITIAL_UNDERTAKINGS) {
      const instId = instMap[und.institutionName] || 'inst-01';
      await execute(
        `INSERT INTO undertakings (
          id, application_id, institution_id, title, statutory_condition, aph_clause, provenance,
          issued_date, due_date, deadline_type, status, evidence_doc_name, evidence_doc_size,
          submitted_at, verified_by, verified_at, verification_notes, escalation_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          und.id, und.applicationId, instId, und.title, und.statutoryCondition, und.aphClause, und.provenance,
          und.issuedDate, und.dueDate, und.deadlineType, und.status, und.evidenceDocName || null,
          und.evidenceDocSize || null, und.submittedAt || null, und.verifiedBy || null,
          und.verifiedAt || null, und.verificationNotes || null, und.escalationLevel
        ]
      );
    }

    console.log('Seeding documents...');
    for (const doc of INITIAL_DOCUMENTS) {
      const instId = instMap[doc.institutionName] || 'inst-01';
      await execute(
        `INSERT INTO prescribed_documents (
          id, institution_id, doc_type, document_number, issued_by_authority, issue_date,
          expiry_date, days_remaining, status, ocr_json, file_size, last_renewed_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          doc.id, instId, doc.docType, doc.documentNumber, doc.issuedByAuthority, doc.issueDate,
          doc.expiryDate, doc.daysRemaining, doc.status, JSON.stringify(doc.ocrExtraction),
          doc.fileSize, doc.lastRenewedDate || null
        ]
      );
    }

    console.log('Seeding notifications...');
    for (const notif of INITIAL_NOTIFICATIONS) {
      await execute(
        `INSERT INTO notifications (
          id, docket_number, recipient_role, recipient_email, subject, body_preview, channel,
          timestamp, status, escalation_level, idempotency_key, attempt_count, last_attempt_at, obligation_still_open
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          notif.id, notif.docketNumber, notif.recipientRole, notif.recipientEmail, notif.subject,
          notif.bodyPreview, notif.channel, notif.timestamp, notif.status, notif.escalationLevel,
          notif.idempotencyKey, notif.attemptCount, notif.lastAttemptAt || null, notif.obligationStillOpen ? 1 : 0
        ]
      );
    }

    console.log('Seeding audit events...');
    for (const audit of INITIAL_AUDIT_LOGS) {
      await execute(
        `INSERT INTO audit_events (
          id, block_height, timestamp, actor_id, actor_name, actor_role, action_type,
          docket_number, previous_stage, new_stage, rule_version, reason_or_observations,
          ip_address, canonical_payload, algorithm, schema_version, previous_hash, current_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          audit.id, audit.blockHeight, audit.timestamp, audit.actorId, audit.actorName,
          audit.actorRole, audit.actionType, audit.docketNumber, audit.previousStage,
          audit.newStage, audit.ruleVersion, audit.reasonOrObservations, audit.ipAddress,
          audit.canonicalPayload, audit.algorithm, audit.schemaVersion, audit.previousHash,
          audit.currentHash
        ]
      );
    }
  });
}
