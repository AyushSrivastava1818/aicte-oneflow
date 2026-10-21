import React, { useState } from 'react';
import { CryptographicAuditRecord, Role } from '../types';
import { 
  FileLock2, 
  CheckCircle2, 
  AlertOctagon, 
  ShieldCheck, 
  RefreshCw, 
  Hash, 
  Download,
  AlertTriangle
} from 'lucide-react';
import { verifyAuditLedgerIntegrity } from '../services/workflowEngine';

interface AuditLedgerProps {
  auditLogs: CryptographicAuditRecord[];
  currentRole: Role;
  onSimulateTamper: () => void;
  onResetTamper: () => void;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({
  auditLogs,
  currentRole,
  onSimulateTamper,
  onResetTamper,
}) => {
  const [verificationResult, setVerificationResult] = useState<{
    isChainValid: boolean;
    brokenBlockIndex: number | null;
    message: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await verifyAuditLedgerIntegrity(auditLogs);
      setVerificationResult(res);
    } finally {
      setIsVerifying(false);
    }
  };

  const exportAuditJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `aicte_oneflow_statutory_audit_ledger_${Date.now()}.json`);
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
            <FileLock2 className="w-5 h-5 text-[#0f3c6e]" />
            <span>Tamper-Evident Cryptographic Audit Ledger (SHA-256 Hash Chain)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every regulatory state transition, deficiency notice, inspection report, and statutory sanction is immutably chained with predecessor cryptographic hashes.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Integrity Verifier Button */}
          <button
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isVerifying ? 'Verifying Hashes...' : 'Verify Cryptographic Integrity'}</span>
          </button>

          {/* Export Ledger */}
          <button
            onClick={exportAuditJSON}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded border border-slate-300 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Ledger</span>
          </button>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      {verificationResult && (
        <div className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
          verificationResult.isChainValid
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-red-50 border-red-300 text-red-950'
        }`}>
          {verificationResult.isChainValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertOctagon className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <strong className="text-sm font-bold">
                {verificationResult.isChainValid
                  ? 'Cryptographic Verification Succeeded: 100% Chain Integrity'
                  : 'CRITICAL AUDIT BREACH: Block Modification / Broken Link Detected'}
              </strong>
              {verificationResult.isChainValid && (
                <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Status: Tamper-Evident Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-slate-700">{verificationResult.message}</p>
          </div>
        </div>
      )}

      {/* SIH Demonstration Box: Test Tamper Detection */}
      <div className="p-3 bg-slate-900 text-slate-200 rounded-lg border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>SIH Judge Demonstrator:</strong> Test tamper detection by simulating an unauthorized database edit on Block #2.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSimulateTamper}
            className="px-2.5 py-1 bg-red-800 hover:bg-red-900 text-white rounded font-semibold text-[11px]"
          >
            Simulate Malicious Tamper
          </button>
          <button
            onClick={onResetTamper}
            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold text-[11px]"
          >
            Restore Authentic Chain
          </button>
        </div>
      </div>

      {/* Audit Blocks Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#0a2540]" />
            <h3 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
              Immutable Block Sequence ({auditLogs.length} Blocks)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Hash Function: SHA-256 (NIST FIPS 180-4)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-4">Block #</th>
                <th className="py-2.5 px-4">Timestamp & IP</th>
                <th className="py-2.5 px-4">Authorised Official</th>
                <th className="py-2.5 px-4">Action & Docket</th>
                <th className="py-2.5 px-4">Transition</th>
                <th className="py-2.5 px-4">Observations / Statutory Reason</th>
                <th className="py-2.5 px-4">Cryptographic Hash Link</th>
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
