import crypto from 'crypto';
import { queryOne, execute } from '../db/database';

export interface AuditBlock {
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

export function buildCanonicalPayload(fields: {
  blockHeight: number;
  timestamp: string;
  actorId: string;
  actionType: string;
  docketNumber: string;
  previousStage: string;
  newStage: string;
  ruleVersion: string;
  reasonOrObservations: string;
  previousHash: string;
}): string {
  // Deterministic JSON key ordering
  const ordered = {
    actionType: fields.actionType,
    actorId: fields.actorId,
    blockHeight: fields.blockHeight,
    docketNumber: fields.docketNumber,
    newStage: fields.newStage,
    previousHash: fields.previousHash,
    previousStage: fields.previousStage,
    reasonOrObservations: fields.reasonOrObservations,
    ruleVersion: fields.ruleVersion,
    timestamp: fields.timestamp,
  };
  return JSON.stringify(ordered);
}

export function computeSha256(canonicalPayload: string): string {
  return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}

export async function appendAuditEvent(params: {
  actorId: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  docketNumber: string;
  previousStage: string;
  newStage: string;
  ruleVersion: string;
  reasonOrObservations: string;
  ipAddress?: string;
}): Promise<AuditBlock> {
  const latestBlock = await queryOne<AuditBlock>(
    'SELECT * FROM audit_events ORDER BY block_height DESC LIMIT 1;'
  );

  const blockHeight = latestBlock ? latestBlock.block_height + 1 : 1;
  const previousHash = latestBlock ? latestBlock.current_hash : 'GENESIS_BLOCK_AICTE_ONEFLOW_00000000000000000000000000000000';
  const timestamp = new Date().toISOString();
  const id = `audit-ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const canonicalPayload = buildCanonicalPayload({
    blockHeight,
    timestamp,
    actorId: params.actorId,
    actionType: params.actionType,
    docketNumber: params.docketNumber,
    previousStage: params.previousStage,
    newStage: params.newStage,
    ruleVersion: params.ruleVersion,
    reasonOrObservations: params.reasonOrObservations,
    previousHash,
  });

  const currentHash = computeSha256(canonicalPayload);

  await execute(
    `INSERT INTO audit_events (
      id, block_height, timestamp, actor_id, actor_name, actor_role, action_type,
      docket_number, previous_stage, new_stage, rule_version, reason_or_observations,
      ip_address, canonical_payload, algorithm, schema_version, previous_hash, current_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      blockHeight,
      timestamp,
      params.actorId,
      params.actorName,
      params.actorRole,
      params.actionType,
      params.docketNumber,
      params.previousStage,
      params.newStage,
      params.ruleVersion,
      params.reasonOrObservations,
      params.ipAddress || '127.0.0.1',
      canonicalPayload,
      'SHA-256',
      '1.0.0',
      previousHash,
      currentHash,
    ]
  );

  return {
    id,
    block_height: blockHeight,
    timestamp,
    actor_id: params.actorId,
    actor_name: params.actorName,
    actor_role: params.actorRole,
    action_type: params.actionType,
    docket_number: params.docketNumber,
    previous_stage: params.previousStage,
    new_stage: params.newStage,
    rule_version: params.ruleVersion,
    reason_or_observations: params.reasonOrObservations,
    ip_address: params.ipAddress || '127.0.0.1',
    canonical_payload: canonicalPayload,
    algorithm: 'SHA-256',
    schema_version: '1.0.0',
    previous_hash: previousHash,
    current_hash: currentHash,
  };
}
