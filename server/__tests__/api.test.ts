import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { seedDatabase } from '../db/seed';

describe('AICTE OneFlow Relational Backend API Suite', () => {
  const app = createApp();
  let adminToken: string;
  let roNorthToken: string;
  let instRepToken: string;

  beforeAll(async () => {
    // Seed fresh database for clean test run
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

  it('GET /api/health should report healthy system status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.database).toBe('CONNECTED');
    expect(res.body.applicationsCount).toBeGreaterThan(0);
  });

  it('POST /api/auth/login should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@aicte.gov.in', password: 'WrongPassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid');
  });

  it('GET /api/applications should enforce regional scope for Regional Officers', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${roNorthToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    // All returned applications must strictly belong to Northern region
    res.body.forEach((appItem: any) => {
      expect(appItem.region).toBe('Northern');
    });
  });

  it('GET /api/applications/:id should prevent cross-regional access for Regional Officers (IDOR prevention)', async () => {
    // Docket app-102 is Western region ('inst-02')
    const res = await request(app)
      .get('/api/applications/app-102')
      .set('Authorization', `Bearer ${roNorthToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access Denied');
  });

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
    // app-101 has an unresolved deficiency (land conversion deed, fire NOC)
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

  it('POST /api/applications/:id/transition should allow transition and record SHA-256 audit block upon valid transition', async () => {
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

  it('GET /api/audit/verify should cryptographically verify the unbroken SHA-256 hash chain', async () => {
    const res = await request(app)
      .get('/api/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.isValid).toBe(true);
    expect(res.body.verifiedBlocks).toBeGreaterThan(0);
    expect(res.body.rootHash).toMatch(/^[a-f0-9]{64}$/);
  });

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
    // und-502 belongs to inst-01 (Apex Institute, which matches instRepToken)
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
});
