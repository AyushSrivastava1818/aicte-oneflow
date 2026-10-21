import { Router, Response } from 'express';
import { query } from '../db/database';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { computeSha256 } from '../services/auditService';

export const auditRouter = Router();

interface AuditRow {
  id: string;
  block_height: number;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  docket_number: string;
  previous_stage: string;
  new_stage: string;
  rule_version: string;
  reason_or_observations: string;
  ip_address: string;
  canonical_payload: string;
  algorithm: string;
  schema_version: string;
  previous_hash: string;
  current_hash: string;
}

// GET /api/audit
auditRouter.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const blocks = await query<AuditRow>(
      'SELECT * FROM audit_events ORDER BY block_height ASC;'
    );

    const formatted = blocks.map((b) => ({
      id: b.id,
      blockHeight: b.block_height,
      timestamp: b.timestamp,
      actorId: b.actor_id,
      actorName: b.actor_name,
      actorRole: b.actor_role,
      actionType: b.action_type,
      docketNumber: b.docket_number,
      previousStage: b.previous_stage,
      newStage: b.new_stage,
      ruleVersion: b.rule_version,
      reasonOrObservations: b.reason_or_observations,
      ipAddress: b.ip_address,
      canonicalPayload: b.canonical_payload,
      algorithm: b.algorithm,
      schemaVersion: b.schema_version,
      previousHash: b.previous_hash,
      currentHash: b.current_hash,
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch audit log', details: err.message });
  }
});

// GET /api/audit/verify (Cryptographic verification of the SHA-256 hash chain)
auditRouter.get('/verify', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const blocks = await query<AuditRow>(
      'SELECT * FROM audit_events ORDER BY block_height ASC;'
    );

    if (blocks.length === 0) {
      res.json({
        isValid: true,
        verifiedBlocks: 0,
        message: 'Audit ledger is empty.',
        rootHash: null,
        verificationTimestamp: new Date().toISOString(),
      });
      return;
    }

    let previousHash = 'GENESIS_BLOCK_AICTE_ONEFLOW_00000000000000000000000000000000';

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Check block height continuity
      if (block.block_height !== i + 1) {
        res.status(400).json({
          isValid: false,
          verifiedBlocks: i,
          failureAtBlock: block.block_height,
          reason: `Block height sequence violation at index ${i}. Expected ${i + 1}, found ${block.block_height}.`,
          verificationTimestamp: new Date().toISOString(),
        });
        return;
      }

      // Check previous hash link
      if (block.previous_hash !== previousHash) {
        res.status(400).json({
          isValid: false,
          verifiedBlocks: i,
          failureAtBlock: block.block_height,
          reason: `Previous hash pointer mismatch at block height ${block.block_height}. Recorded ${block.previous_hash}, expected ${previousHash}.`,
          verificationTimestamp: new Date().toISOString(),
        });
        return;
      }

      // Cross-verify canonical payload content against table columns
      try {
        const parsed = JSON.parse(block.canonical_payload);
        if (
          parsed.reasonOrObservations !== block.reason_or_observations ||
          parsed.docketNumber !== block.docket_number ||
          parsed.newStage !== block.new_stage
        ) {
          res.status(400).json({
            isValid: false,
            verifiedBlocks: i,
            failureAtBlock: block.block_height,
            reason: `Data tampering detected at block height ${block.block_height}. Row values diverge from immutable canonical payload!`,
            verificationTimestamp: new Date().toISOString(),
          });
          return;
        }
      } catch {
        res.status(400).json({
          isValid: false,
          verifiedBlocks: i,
          failureAtBlock: block.block_height,
          reason: `Corrupted canonical payload JSON at block height ${block.block_height}.`,
          verificationTimestamp: new Date().toISOString(),
        });
        return;
      }

      // Recompute SHA-256 from canonical payload
      const calculatedHash = computeSha256(block.canonical_payload);
      if (calculatedHash !== block.current_hash) {
        res.status(400).json({
          isValid: false,
          verifiedBlocks: i,
          failureAtBlock: block.block_height,
          reason: `Cryptographic digest mismatch at block height ${block.block_height}. Tampered content detected! Computed ${calculatedHash}, found ${block.current_hash}.`,
          verificationTimestamp: new Date().toISOString(),
        });
        return;
      }

      previousHash = block.current_hash;
    }

    const tipHash = blocks[blocks.length - 1].current_hash;

    res.json({
      isValid: true,
      verifiedBlocks: blocks.length,
      rootHash: tipHash,
      cryptographicModel: 'SHA-256 Hash Chained Event Log (Canonical JSON RFC 8785 aligned)',
      securityDisclosure: 'Verification validates sequential link continuity and cryptographic digests from Genesis Block. Non-repudiation against direct database file overwrite requires external checkpoint anchoring.',
      message: `Complete cryptographic integrity confirmed across all ${blocks.length} blocks. Zero mutations detected.`,
      verificationTimestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Verification failed', details: err.message });
  }
});
