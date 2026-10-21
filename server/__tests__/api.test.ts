import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { seedDatabase } from '../db/seed';
import { setDatabasePath, getDbFilePath, execute, query, transaction } from '../db/database';
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, clearRevokedTokens, generateToken } from '../middleware/auth';

describe('AICTE OneFlow Relational Backend & Security Hardening Suite', () => {
  const app = createApp();
  const testDbFile = path.resolve(process.cwd(), 'data', 'test_aicte_oneflow.sqlite');
  let adminToken: string;
  let roNorthToken: string;
  let instRepToken: string;

  beforeAll(async () => {
    // Isolate test database so development/demo database is never touched
    setDatabasePath(testDbFile);
    clearRevokedTokens();
    await seedDatabase();

    // Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@aicte.gov.in', password: 'Password@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;

    // Login RO North
    const roRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ro.north@aicte.gov.in', password: 'Password@123' });
    expect(roRes.status).toBe(200);
    roNorthToken = roRes.body.token;

    // Login Inst Rep (inst-01)
    const instRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'registrar@apex.edu', password: 'Password@123' });
    expect(instRes.status).toBe(200);
    instRepToken = instRes.body.token;
  });

  afterAll(() => {
    // Clean up isolated test database file
    try {
      if (fs.existsSync(testDbFile)) {
        fs.unlinkSync(testDbFile);
      }
    } catch {}
    setDatabasePath(null); // restore default
  });

  describe('1. Health and System Verification', () => {
    it('GET /api/health should report healthy status with verified database connection', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.database).toBe('CONNECTED');
      expect(res.body.applicationsCount).toBeGreaterThan(0);
      expect(getDbFilePath()).toBe(testDbFile);
    });
  });

  describe('2. Authentication, Token Expiry, and Revocation Hardening', () => {
    it('POST /api/auth/login should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@aicte.gov.in', password: 'WrongPassword' });
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    it('Should reject forged tokens signed with an invalid secret', async () => {
      const forgedToken = jwt.sign(
        { id: 'usr-admin-01', role: 'CENTRAL_ADMIN' },
        'forged_untrusted_secret_key',
        { issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
      );
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${forgedToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
    });

    it('Should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { id: 'usr-admin-01', email: 'admin@aicte.gov.in', role: 'CENTRAL_ADMIN' },
        JWT_SECRET,
        { expiresIn: '-1s', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
      );
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('expired');
    });

    it('POST /api/auth/logout should revoke the token and reject subsequent requests', async () => {
      // Login fresh session
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@aicte.gov.in', password: 'Password@123' });
      const tempToken = loginRes.body.token;

      // Access should work before logout
      const beforeRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(beforeRes.status).toBe(200);

      // Logout session
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Access should now be rejected as revoked
      const afterRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(afterRes.status).toBe(401);
      expect(afterRes.body.error).toContain('revoked');
    });
  });

  describe('3. Regional Scoping & Institutional IDOR Protections', () => {
    it('GET /api/applications should enforce regional scope for Regional Officers', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${roNorthToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach((appItem: any) => {
        expect(appItem.region).toBe('Northern');
      });
    });

    it('GET /api/applications/:id should prevent cross-regional access (IDOR prevention)', async () => {
      // app-102 is Western region ('inst-02')
      const res = await request(app)
        .get('/api/applications/app-102')
        .set('Authorization', `Bearer ${roNorthToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access Denied');
    });

    it('POST /api/undertakings/:id/upload should prevent institutional representative from uploading to foreign institution', async () => {
      // und-501 belongs to inst-02 (Sardar Patel College), but instRepToken is from inst-01 (Apex)
      const res = await request(app)
        .post('/api/undertakings/und-501/upload')
        .set('Authorization', `Bearer ${instRepToken}`)
        .send({
          evidenceDocName: 'Unauthorized_Lease.pdf',
          evidenceDocSize: '1.2 MB',
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('foreign institution');
    });
  });

  describe('4. Deterministic State Machine & Prerequisite Verification', () => {
    it('GET /api/applications should include Explainable Case Action Ledger for each case', async () => {
      const res = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const firstApp = res.body[0];
      expect(firstApp.nextActionLedger).toBeDefined();
      expect(firstApp.nextActionLedger.nextAction).toBeDefined();
      expect(firstApp.nextActionLedger.why).toBeDefined();
      expect(firstApp.nextActionLedger.responsibleRole).toBeDefined();
      expect(firstApp.nextActionLedger.ruleSource).toBeDefined();
    });

    it('POST /api/applications/:id/transition should block transition if statutory prerequisites are not met', async () => {
      // app-101 has active deficiencies and unverified fire NOC
      const res = await request(app)
        .post('/api/applications/app-101/transition')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStage: 'SCRUTINY_CLEARED',
          observations: 'Attempting clearance without resolving deficiency',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Mandatory prerequisites not satisfied');
      expect(res.body.missingPrerequisites.length).toBeGreaterThan(0);
    });

    it('GET /api/applications/:id should return complete 18-attribute authoritative domain model for next action', async () => {
      const res = await request(app)
        .get('/api/applications/app-101')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const ledger = res.body.nextActionLedger;
      expect(ledger.actionId).toBeDefined();
      expect(ledger.category).toBeDefined();
      expect(ledger.status).toBeDefined();
      expect(ledger.ruleReference).toBe('RULE-APH-DEFICIENCY-02');
      expect(ledger.sourceDocument).toContain('AICTE Approval Process Handbook');
      expect(ledger.sectionClause).toBe('Chapter II, Clause 2.4(a)');
      expect(ledger.ruleVerificationStatus).toBe('VERIFIED_OFFICIAL_REGULATION');
      expect(ledger.generatedBy).toBe('DETERMINISTIC_WORKFLOW_POLICY');
      expect(ledger.availabilityRationale).toBeDefined();
      expect(ledger.completionImpact).toBeDefined();
      expect(Array.isArray(ledger.prerequisites)).toBe(true);
      expect(Array.isArray(ledger.blockingConditions)).toBe(true);
    });

    it('POST /api/applications/:id/transition should reject Statutory Auditor with 403 (read-only)', async () => {
      const auditorToken = generateToken({
        id: 'usr-auditor-test',
        email: 'auditor@cag.gov.in',
        name: 'Vigilance Auditor',
        role: 'STATUTORY_AUDITOR',
        regionScope: null,
        institutionId: null,
      });

      const res = await request(app)
        .post('/api/applications/app-101/transition')
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({
          targetStage: 'UNDER_SCRUTINY',
          observations: 'Auditor unauthorized mutation attempt',
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Statutory Auditor has read-only oversight permissions');
    });

    it('POST /api/applications/:id/transition should block APPROVED_UNCONDITIONAL if active undertakings remain', async () => {
      // app-102 has pending undertakings (und-501)
      const res = await request(app)
        .post('/api/applications/app-102/transition')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStage: 'APPROVED_UNCONDITIONAL',
          observations: 'Attempting unconditional seal with pending undertaking',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('time-bound conditional undertakings must be verified compliant');
    });

    it('POST /api/applications/:id/transition should execute valid transition and commit SHA-256 block', async () => {
      // app-102 is in SCRUTINY_CLEARED, transitioning to EVC_QUEUED by Admin
      const res = await request(app)
        .post('/api/applications/app-102/transition')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStage: 'EVC_QUEUED',
          observations: 'Regional Committee dispatched EVC panel.',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.transition.auditBlockHeight).toBeDefined();
      expect(res.body.transition.auditCurrentHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('5. Database Concurrency, ACID Rollback, and Single-Writer Safety', () => {
    it('Should execute 10 concurrent database operations without corruption or interleaving errors', async () => {
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          execute(
            `UPDATE institutions SET address = ? WHERE id = 'inst-01';`,
            [`Knowledge Park III, Greater Noida (Update test iteration ${i})`]
          )
        );
      }
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('Should execute transaction rollback cleanly when an error occurs inside transaction callback', async () => {
      const addressBefore = (await query<any>("SELECT address FROM institutions WHERE id = 'inst-01';"))[0].address;

      await expect(
        transaction(async () => {
          await execute("UPDATE institutions SET address = 'CORRUPTED_SHOULD_ROLLBACK' WHERE id = 'inst-01';");
          throw new Error('SIMULATED_TRANSACTION_FAILURE');
        })
      ).rejects.toThrow('SIMULATED_TRANSACTION_FAILURE');

      const addressAfter = (await query<any>("SELECT address FROM institutions WHERE id = 'inst-01';"))[0].address;
      expect(addressAfter).toBe(addressBefore);
    });
  });

  describe('6. Cryptographic Audit Chain & Tamper Detection', () => {
    it('GET /api/audit/verify should confirm uncompromised SHA-256 chain integrity', async () => {
      const res = await request(app)
        .get('/api/audit/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(true);
      expect(res.body.verifiedBlocks).toBeGreaterThan(0);
      expect(res.body.rootHash).toMatch(/^[a-f0-9]{64}$/);
      expect(res.body.securityDisclosure).toBeDefined();
    });

    it('GET /api/audit/verify should detect tampering if an audit event payload is modified in SQLite', async () => {
      // 1. Temporarily tamper with block 2's payload
      const originalBlock = (await query<any>('SELECT * FROM audit_events WHERE block_height = 2;'))[0];
      await execute(
        "UPDATE audit_events SET reason_or_observations = 'MALICIOUS_UNAUTHORIZED_MUTATION' WHERE block_height = 2;"
      );

      // 2. Verification must detect the digest mismatch at block 2
      const res = await request(app)
        .get('/api/audit/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.isValid).toBe(false);
      expect(res.body.failureAtBlock).toBe(2);
      expect(res.body.reason.toLowerCase()).toContain('tampering detected');

      // 3. Restore original block so subsequent tests pass
      await execute(
        'UPDATE audit_events SET reason_or_observations = ? WHERE block_height = 2;',
        [originalBlock.reason_or_observations]
      );

      const restoreRes = await request(app)
        .get('/api/audit/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.isValid).toBe(true);
    });
  });

  describe('7. Subsystem Workflows: EVC, Undertakings, Documents & Notifications', () => {
    it('POST /api/evc/:id/schedule should objectively evaluate conflict heuristics', async () => {
      const res = await request(app)
        .post('/api/evc/evc-01/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          scheduledDate: '2026-11-15',
          coordinatorName: 'Dr. S. K. Gupta',
        });
      expect(res.status).toBe(200);
      expect(res.body.conflictCheckStatus).toBeDefined();
      expect(res.body.conflictCheckNotes).toBeDefined();
    });

    it('POST /api/undertakings/:id/upload should mark status SUBMITTED_UNDER_REVIEW (Submission != Compliance)', async () => {
      const res = await request(app)
        .post('/api/undertakings/und-502/upload')
        .set('Authorization', `Bearer ${instRepToken}`)
        .send({
          evidenceDocName: 'Cadre_Affidavit_Notarized_2026.pdf',
          evidenceDocSize: '2.4 MB',
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUBMITTED_UNDER_REVIEW');
      expect(res.body.message).toContain('Submission does not imply compliance');
    });

    it('POST /api/undertakings/:id/verify should allow Bureau officer to verify compliance', async () => {
      const res = await request(app)
        .post('/api/undertakings/und-502/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'APPROVE',
          verificationNotes: 'Verified faculty roll with EPFO challan verification.',
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('VERIFIED_COMPLIANT');
    });

    it('POST /api/documents/:id/confirm-ocr should store human verification for candidate OCR', async () => {
      const res = await request(app)
        .post('/api/documents/doc-801/confirm-ocr')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          confirmedIssueDate: '2025-06-01',
          confirmedExpiryDate: '2026-11-30',
          notes: 'Verified against Municipal Seal and Stamp.',
        });
      expect(res.status).toBe(200);
      expect(res.body.doc.ocrExtraction.isHumanVerified).toBe(true);
    });

    it('POST /api/notifications/reconcile should idempotently sweep without duplicate creation', async () => {
      // First sweep
      const sweep1 = await request(app)
        .post('/api/notifications/reconcile')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(sweep1.status).toBe(200);
      expect(sweep1.body.deliveryAdapter).toBe('SIMULATED_NIC_SMTP_GATEWAY');

      // Immediate second sweep must create 0 new duplicate alerts (idempotency enforced)
      const sweep2 = await request(app)
        .post('/api/notifications/reconcile')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(sweep2.status).toBe(200);
      expect(sweep2.body.newAlertsCreated).toBe(0);
    });

    it('POST /api/admin/reset-demo should reject requests missing the required safety confirmation', async () => {
      const res = await request(app)
        .post('/api/reset-demo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirmation: 'WRONG_CONFIRMATION' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Safety confirmation required');
    });
  });
});
