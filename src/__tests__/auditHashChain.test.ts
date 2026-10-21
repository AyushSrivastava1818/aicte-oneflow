import { describe, it, expect } from 'vitest';
import { 
  verifyAuditLedgerIntegrity, 
  computeSha256, 
  createCanonicalPayload 
} from '../services/workflowEngine';
import { INITIAL_AUDIT_LOGS } from '../data/seedData';
import { CryptographicAuditRecord } from '../types';

describe('Hash-Chained Audit Log Integrity & Cryptographic Verifier', () => {
  it('validates the authentic seed audit ledger with 100% integrity', async () => {
    const result = await verifyAuditLedgerIntegrity(INITIAL_AUDIT_LOGS);
    expect(result.isChainValid).toBe(true);
    expect(result.brokenBlockIndex).toBeNull();
    expect(result.message).toContain('Zero tampering detected');
  });

  it('detects unauthorized payload alteration in a block', async () => {
    // Clone and tamper with block #2 payload content
    const tamperedLogs: CryptographicAuditRecord[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    tamperedLogs[1].canonicalPayload = JSON.stringify({
      ...JSON.parse(tamperedLogs[1].canonicalPayload),
      reasonOrObservations: 'UNAUTHORIZED_ALTERATION: Artificial clearance of critical deficiencies',
    });

    const result = await verifyAuditLedgerIntegrity(tamperedLogs);
    expect(result.isChainValid).toBe(false);
    expect(result.brokenBlockIndex).toBe(1); // Block #2
    expect(result.message).toContain('Content modification detected in block #2');
  });

  it('detects broken predecessor hash linkage when a block is spliced', async () => {
    const tamperedLogs: CryptographicAuditRecord[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    tamperedLogs[2].previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

    const result = await verifyAuditLedgerIntegrity(tamperedLogs);
    expect(result.isChainValid).toBe(false);
    expect(result.brokenBlockIndex).toBe(2);
    expect(result.message).toContain('Hash link mismatch at block #3');
  });

  it('computes deterministic SHA-256 hashes matching canonical JSON serialization', async () => {
    const block = INITIAL_AUDIT_LOGS[0];
    const canonical = createCanonicalPayload(block);
    const hash = await computeSha256(canonical);
    expect(hash).toBe(block.currentHash);
  });
});
