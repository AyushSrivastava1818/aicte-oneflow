import React, { useState } from 'react';
import { CryptographicAuditRecord } from '../types';
import { 
  FileLock2, 
  CheckCircle2, 
  AlertOctagon, 
  ShieldCheck, 
  Hash, 
  Download, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { verifyAuditLedgerIntegrity } from '../services/workflowEngine';

import { Role } from '../types';

interface AuditLedgerProps {
  auditLogs: CryptographicAuditRecord[];
  currentRole?: Role;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({ 
  auditLogs,
  currentRole = 'STATUTORY_AUDITOR',
}) => {
  // Live Ledger Verification state
  const [liveVerificationResult, setLiveVerificationResult] = useState<{
    isChainValid: boolean;
    brokenBlockIndex: number | null;
    message: string;
  } | null>(null);
  const [isVerifyingLive, setIsVerifyingLive] = useState(false);

  // Safe Isolated Sandbox Fixture for Tamper Demonstration (Never touches live records!)
  const [sandboxFixture, setSandboxFixture] = useState<CryptographicAuditRecord[]>(() => 
    JSON.parse(JSON.stringify(auditLogs))
  );
  const [sandboxTampered, setSandboxTampered] = useState(false);
  const [sandboxVerificationResult, setSandboxVerificationResult] = useState<{
    isChainValid: boolean;
    brokenBlockIndex: number | null;
    message: string;
  } | null>(null);
  const [isVerifyingSandbox, setIsVerifyingSandbox] = useState(false);

  const handleVerifyLive = async () => {
    setIsVerifyingLive(true);
    setLiveVerificationResult(null);
    try {
      const res = await verifyAuditLedgerIntegrity(auditLogs);
      setLiveVerificationResult(res);
    } finally {
      setIsVerifyingLive(false);
    }
  };

  const handleVerifySandbox = async () => {
    setIsVerifyingSandbox(true);
    setSandboxVerificationResult(null);
    try {
      const res = await verifyAuditLedgerIntegrity(sandboxFixture);
      setSandboxVerificationResult(res);
    } finally {
      setIsVerifyingSandbox(false);
    }
  };

  const handleInjectSandboxTamper = () => {
    setSandboxFixture(prev => prev.map((block, idx) => {
      if (idx === 1) { // Block #2
        return {
          ...block,
          canonicalPayload: JSON.stringify({
            ...JSON.parse(block.canonicalPayload),
            reasonOrObservations: 'UNAUTHORIZED_ALTERATION: Artificial clearance of critical deficiencies without bureau authorization.',
          }),
        };
      }
      return block;
    }));
    setSandboxTampered(true);
    setSandboxVerificationResult(null);
  };

  const handleResetSandbox = () => {
    setSandboxFixture(JSON.parse(JSON.stringify(auditLogs)));
    setSandboxTampered(false);
    setSandboxVerificationResult(null);
  };

  const exportAuditJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `aicte_sanrakshak_hash_chained_audit_ledger_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0a2540] flex items-center gap-2">
            <FileLock2 className="w-5 h-5 text-[#0f3c6e]" aria-hidden="true" />
            <span>Cryptographically Hash-Chained Audit Log (SHA-256 Predecessor Chain)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every regulatory state transition, deficiency notice, inspection report, and statutory sanction is linked to predecessor SHA-256 hashes using canonical serialization.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Integrity Verifier Button */}
          <button
            onClick={handleVerifyLive}
            disabled={isVerifyingLive}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>{isVerifyingLive ? 'Verifying Hashes...' : 'Verify Live Ledger Integrity'}</span>
          </button>

          {/* Export Ledger */}
          <button
            onClick={exportAuditJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded border border-slate-300 transition-all focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export JSON Ledger</span>
          </button>
        </div>
      </div>

      {/* Statutory Auditor Mode Indicator */}
      {currentRole === 'STATUTORY_AUDITOR' && (
        <div className="bg-rose-50 border border-rose-300 p-3 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse flex-shrink-0"></span>
            <strong className="text-rose-950 font-bold">CVC / CAG Vigilance Directorate Inspection Mode:</strong>
            <span className="text-slate-700">Audit session authenticated for independent tamper detection and provenance verification.</span>
          </div>
          <span className="text-[10px] font-mono uppercase font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
            NIST FIPS 180-4
          </span>
        </div>
      )}

      {/* Live Verification Feedback Banner */}
      {liveVerificationResult && (
        <div className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
          liveVerificationResult.isChainValid
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-red-50 border-red-300 text-red-950'
        }`} role="status">
          {liveVerificationResult.isChainValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <AlertOctagon className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <strong className="text-sm font-bold">
                {liveVerificationResult.isChainValid
                  ? 'Cryptographic Verification Succeeded: 100% Chain Integrity'
                  : 'AUDIT DISCREPANCY DETECTED'}
              </strong>
              {liveVerificationResult.isChainValid && (
                <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Status: NIST FIPS 180-4 Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-slate-700">{liveVerificationResult.message}</p>
          </div>
        </div>
      )}

      {/* SIH Demonstration Box: Safe Isolated Sandbox Tamper Demonstrator */}
      <div className="p-4 bg-slate-900 text-slate-200 rounded-lg border border-slate-800 text-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
            <div>
              <strong className="text-white text-xs block">
                SIH Judging Demonstrator: Isolated Sandbox Tamper Testing
              </strong>
              <span className="text-[11px] text-slate-400">
                Safe sandbox fixture: Demonstrates tamper detection without modifying live application records.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded">
            SANDBOX FIXTURE
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-slate-300">
            {sandboxTampered ? (
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" aria-hidden="true" />
                Sandbox Status: Simulated modification injected into Block #2 payload.
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Sandbox Status: Synchronized with authentic ledger (unmodified).
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!sandboxTampered ? (
              <button
                onClick={handleInjectSandboxTamper}
                className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded font-semibold text-[11px] focus-visible:ring-1 focus-visible:ring-red-400"
              >
                Inject Sandbox Tamper (Block #2)
              </button>
            ) : (
              <button
                onClick={handleResetSandbox}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold text-[11px] flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-slate-400"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Reset Sandbox</span>
              </button>
            )}

            <button
              onClick={handleVerifySandbox}
              disabled={isVerifyingSandbox}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[11px] focus-visible:ring-1 focus-visible:ring-amber-400"
            >
              {isVerifyingSandbox ? 'Testing...' : 'Verify Sandbox Fixture'}
            </button>
          </div>
        </div>

        {sandboxVerificationResult && (
          <div className={`p-2.5 rounded text-[11px] border ${
            sandboxVerificationResult.isChainValid
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}>
            <strong>Sandbox Result:</strong> {sandboxVerificationResult.message}
          </div>
        )}
      </div>

      {/* Audit Blocks Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#0a2540]" aria-hidden="true" />
            <h3 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
              Immutable Hash-Chained Block Sequence ({auditLogs.length} Blocks)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Hash Algorithm: SHA-256 (Canonical Serialized)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs" aria-label="Cryptographic Audit Blocks">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th scope="col" className="py-2.5 px-4">Block #</th>
                <th scope="col" className="py-2.5 px-4">Timestamp & Node</th>
                <th scope="col" className="py-2.5 px-4">Authorised Official</th>
                <th scope="col" className="py-2.5 px-4">Action & Docket</th>
                <th scope="col" className="py-2.5 px-4">Transition</th>
                <th scope="col" className="py-2.5 px-4">Reason & Sourced Clause</th>
                <th scope="col" className="py-2.5 px-4">SHA-256 Hash Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {auditLogs.map((block) => (
                <tr key={block.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#0a2540]">
                    #{block.blockHeight}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono text-[11px] text-slate-700">
                      {new Date(block.timestamp).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {block.ipAddress}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{block.actorName}</div>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                      {block.actorRole}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-[#0f3c6e] block font-mono text-[11px]">
                      {block.docketNumber}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800">
                      {block.actionType}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {block.previousStage}
                    </span>
                    <span className="text-[11px] text-slate-800 font-bold font-mono">
                      → {block.newStage}
                    </span>
                  </td>

                  <td className="py-3 px-4 max-w-xs">
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {block.reasonOrObservations}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      Rule: {block.ruleVersion}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-[10px]">
                    <div className="text-slate-400 truncate max-w-[140px]" title={`Prev: ${block.previousHash}`}>
                      Prev: {block.previousHash.slice(0, 14)}...
                    </div>
                    <div className="text-emerald-700 font-bold truncate max-w-[140px]" title={`Hash: ${block.currentHash}`}>
                      Curr: {block.currentHash.slice(0, 14)}...
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
