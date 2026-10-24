import React, { useState } from 'react';
import { Undertaking } from '../types';
import { 
  FileCheck, 
  Upload, 
  CheckCircle2, 
  AlertOctagon, 
  Clock, 
  FileText 
} from 'lucide-react';
import { calculateDaysRemaining } from '../services/workflowEngine';

import { Role } from '../types';

interface UndertakingsTrackerProps {
  undertakings: Undertaking[];
  onUploadEvidence: (id: string, fileName: string) => void;
  onVerifyUndertaking: (id: string, verified: boolean, notes: string) => void;
  currentRole?: Role;
}

export const UndertakingsTracker: React.FC<UndertakingsTrackerProps> = ({
  undertakings,
  onUploadEvidence,
  onVerifyUndertaking,
  currentRole = 'REGIONAL_OFFICER',
}) => {
  const [selectedUndertakingId, setSelectedUndertakingId] = useState<string>(undertakings[0]?.id || '');
  const [uploadFileName, setUploadFileName] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const selectedUnd = undertakings.find(u => u.id === selectedUndertakingId) || undertakings[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0a2540] flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#0f3c6e]" aria-hidden="true" />
            <span>Time-Bound Statutory Undertaking & Compliance Register</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Key Architectural Rule: <strong>Document submission does not equate to compliance.</strong> Submissions require explicit Bureau scrutiny.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded">
            {undertakings.filter(u => u.status === 'OVERDUE_ESCALATED').length} Overdue Obligations
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Undertaking Register (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col h-[650px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50 font-bold text-xs text-[#0a2540] uppercase tracking-wider flex justify-between">
            <span>Obligation Register</span>
            <span>Compliance Status</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100" role="list">
            {undertakings.map((u) => {
              const isSelected = u.id === selectedUnd?.id;
              const daysLeft = calculateDaysRemaining(u.dueDate);
              const isOverdue = daysLeft < 0 || u.status === 'OVERDUE_ESCALATED';

              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUndertakingId(u.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedUndertakingId(u.id); }}
                  className={`p-3.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-[#0f3c6e]' : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono font-bold text-[#0f3c6e] bg-slate-100 px-1.5 py-0.5 rounded">
                      {u.aphClause}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      u.status === 'VERIFIED_COMPLIANT' ? 'bg-emerald-100 text-emerald-900' :
                      u.status === 'SUBMITTED_UNDER_REVIEW' ? 'bg-blue-100 text-blue-900' :
                      u.status === 'OVERDUE_ESCALATED' ? 'bg-red-100 text-red-900' :
                      'bg-amber-100 text-amber-900'
                    }`}>
                      {u.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
                    {u.title}
                  </h4>

                  <div className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                    {u.institutionName}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Due: {new Date(u.dueDate).toLocaleDateString()}</span>
                    {isOverdue ? (
                      <span className="text-red-600 font-bold flex items-center gap-0.5">
                        <AlertOctagon className="w-3 h-3" aria-hidden="true" /> Overdue
                      </span>
                    ) : (
                      <span className="text-slate-600 font-medium">
                        {daysLeft} days remaining
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Obligation Dossier (7 Cols) */}
        {selectedUnd && (
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-mono font-bold text-[#0f3c6e]">
                    Docket: {selectedUnd.docketNumber}
                  </span>
                  <h3 className="text-sm font-bold text-[#0a2540] mt-0.5">
                    {selectedUnd.title}
                  </h3>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {selectedUnd.institutionName}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                    selectedUnd.status === 'VERIFIED_COMPLIANT' ? 'bg-emerald-100 text-emerald-800' :
                    selectedUnd.status === 'SUBMITTED_UNDER_REVIEW' ? 'bg-blue-100 text-blue-800' :
                    selectedUnd.status === 'OVERDUE_ESCALATED' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedUnd.status}
                  </span>
                </div>
              </div>

              {/* Statutory Condition */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <span className="font-bold text-slate-800 block">Statutory Source Condition:</span>
                <p className="text-slate-700 leading-relaxed">{selectedUnd.statutoryCondition}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Enforced under: {selectedUnd.aphClause}
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 rounded">
                    {selectedUnd.provenance}
                  </span>
                </div>
              </div>

              {/* Submitted Evidence Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
                  Submitted Evidence & Verification Dossier
                </h4>

                {selectedUnd.evidenceDocName ? (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#0f3c6e]" aria-hidden="true" />
                        <span className="font-bold text-slate-900">{selectedUnd.evidenceDocName}</span>
                        <span className="text-[10px] text-slate-500">({selectedUnd.evidenceDocSize})</span>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                        Uploaded {selectedUnd.submittedAt ? new Date(selectedUnd.submittedAt).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>

                    {selectedUnd.verificationNotes && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-blue-100 mt-1">
                        <strong>Reviewer Note:</strong> {selectedUnd.verificationNotes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-700" aria-hidden="true" />
                      <span>Pending evidence submission from institution.</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Escalation Matrix Indicator */}
              {selectedUnd.escalationLevel > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-900 flex items-center gap-2" role="alert">
                  <AlertOctagon className="w-4 h-4 text-red-700 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="font-bold">Active SLA Escalation (Level {selectedUnd.escalationLevel}):</strong>
                    <p className="text-[11px]">
                      {selectedUnd.escalationLevel === 1 
                        ? 'Notice transmitted to Regional Officer for institution hearing.'
                        : 'Transmitted to AICTE Member Secretary & Central Vigilance Directorate for penalty proceedings.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions Console */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2.5">
                {currentRole !== 'STATUTORY_AUDITOR' ? (
                  <>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{currentRole === 'INSTITUTION_REP' ? 'Upload Compliance Supporting Proof (PDF)' : 'Upload / Replace Evidence PDF'}</span>
                    </button>

                    {selectedUnd.evidenceDocName && selectedUnd.status !== 'VERIFIED_COMPLIANT' && (
                      currentRole !== 'INSTITUTION_REP' ? (
                        <button
                          onClick={() => setShowVerifyModal(true)}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Officer Verification & Sign-off</span>
                        </button>
                      ) : (
                        <div className="text-xs text-amber-900 bg-amber-50 px-3 py-1.5 rounded border border-amber-200 flex items-center gap-1.5">
                          <span>Evidence submitted. Awaiting Bureau Officer verification under Rule APH 1.4(g) (Submission ≠ Compliance).</span>
                        </div>
                      )
                    )}
                  </>
                ) : (
                  <div className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
                    <span>
                      Auditor View: Evidence document timestamped for cryptographic audit trail. Mutations disabled under Read-Only Clearance.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Upload Evidence */}
      {showUploadModal && selectedUnd && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <h3 id="upload-modal-title" className="text-sm font-bold text-[#0a2540] border-b border-slate-100 pb-2">
              Upload Compliance Supporting Evidence
            </h3>
            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Upload verified deed or certificate (PDF format, max 10MB).
              </p>
              <div>
                <label htmlFor="evidence-name-input" className="font-semibold text-slate-700 block mb-1">
                  Evidence Document Name
                </label>
                <input
                  id="evidence-name-input"
                  type="text"
                  placeholder="e.g. Registered_Lease_Extension_Deed_2026.pdf"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                disabled={!uploadFileName.trim()}
                onClick={() => {
                  onUploadEvidence(selectedUnd.id, uploadFileName.trim());
                  setShowUploadModal(false);
                  setUploadFileName('');
                }}
                className="px-3.5 py-1.5 text-xs bg-[#0f3c6e] hover:bg-[#0a2540] text-white rounded font-semibold disabled:opacity-50"
              >
                Submit Evidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Officer Verification */}
      {showVerifyModal && selectedUnd && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <h3 id="verify-modal-title" className="text-sm font-bold text-[#0a2540] border-b border-slate-100 pb-2">
              Regulatory Officer Verification
            </h3>
            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Examine evidence document <strong>{selectedUnd.evidenceDocName}</strong> against APH norms.
              </p>
              <div>
                <label htmlFor="verify-notes-input" className="font-semibold text-slate-700 block mb-1">
                  Verification Findings & Order Remarks
                </label>
                <textarea
                  id="verify-notes-input"
                  rows={3}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g. Verified genuine against Sub-Registrar stamp duty portal. 30-year requirement fulfilled."
                  className="w-full p-2 border border-slate-300 rounded text-slate-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onVerifyUndertaking(selectedUnd.id, false, verificationNotes || 'Deficiencies noted in uploaded document.');
                  setShowVerifyModal(false);
                }}
                className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold"
              >
                Return for Correction
              </button>
              <button
                onClick={() => {
                  onVerifyUndertaking(selectedUnd.id, true, verificationNotes || 'Verified 100% compliant with APH norms.');
                  setShowVerifyModal(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold"
              >
                Certify Compliant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
