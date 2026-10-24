import React, { useState } from 'react';
import { EVCRecord } from '../types';
import { 
  Users, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

import { Role } from '../types';

interface EVCSchedulerProps {
  evcRecords: EVCRecord[];
  onScheduleVisit: (evcId: string, visitDate: string) => void;
  onSubmitOutcome: (evcId: string, recommendation: 'RECOMMENDED_FULL' | 'RECOMMENDED_WITH_CONDITIONS' | 'REJECTED_DEFICIENT', remarks: string) => void;
  currentRole?: Role;
}

export const EVCScheduler: React.FC<EVCSchedulerProps> = ({
  evcRecords,
  onScheduleVisit,
  onSubmitOutcome,
  currentRole = 'REGIONAL_OFFICER',
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>(evcRecords[0]?.id || '');
  const [scheduleDate, setScheduleDate] = useState('2026-10-28T10:00');
  const [outcomeRecommendation, setOutcomeRecommendation] = useState<'RECOMMENDED_FULL' | 'RECOMMENDED_WITH_CONDITIONS' | 'REJECTED_DEFICIENT'>('RECOMMENDED_FULL');
  const [outcomeRemarks, setOutcomeRemarks] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);

  const selectedRecord = evcRecords.find(r => r.id === selectedRecordId) || evcRecords[0];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0a2540] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0f3c6e]" aria-hidden="true" />
            <span>Expert Visit Committee (EVC) Operations & Inspection Desk</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rule APH 2024–27: Source-linked readiness checklists, objective conflict-of-interest review, and peer inspection outcomes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-[#0f3c6e] rounded border border-blue-200">
            {evcRecords.length} Active EVC Dockets
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: EVC Dockets List */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col h-[650px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50 font-bold text-xs text-[#0a2540] uppercase tracking-wider flex justify-between">
            <span>Inspection Queue</span>
            <span>Status</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100" role="list">
            {evcRecords.map((rec) => {
              const isSelected = rec.id === selectedRecord?.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecordId(rec.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedRecordId(rec.id); }}
                  className={`p-3.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-[#0f3c6e]' : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-[#0a2540]">{rec.docketNumber}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      rec.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-900' :
                      rec.status === 'REPORT_SUBMITTED' ? 'bg-emerald-100 text-emerald-900' :
                      'bg-amber-100 text-amber-900'
                    }`}>
                      {rec.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
                    {rec.institutionName}
                  </h4>

                  <div className="text-[11px] text-slate-500 flex justify-between items-center mt-2">
                    <span>Region: {rec.region}</span>
                    {rec.scheduledDate ? (
                      <span className="font-mono text-slate-700">
                        Visit: {new Date(rec.scheduledDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Awaiting Schedule</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Inspection Dossier */}
        {selectedRecord && (
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0a2540]">
                    {selectedRecord.institutionName}
                  </h3>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                    <span>Docket: <strong className="font-mono">{selectedRecord.docketNumber}</strong></span>
                    <span>•</span>
                    <span>Coordinator: {selectedRecord.coordinatorName}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                    selectedRecord.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                    selectedRecord.status === 'REPORT_SUBMITTED' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedRecord.status}
                  </span>
                </div>
              </div>

              {/* Conflict of Interest Review Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                  selectedRecord.conflictCheckStatus === 'NO_KNOWN_CONFLICT_DETECTED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : selectedRecord.conflictCheckStatus === 'POTENTIAL_CONFLICT_REQUIRES_REVIEW'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-red-50 border-red-200 text-red-950'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {selectedRecord.conflictCheckStatus === 'NO_KNOWN_CONFLICT_DETECTED' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                    )}
                    <span>Conflict-of-Interest Status: {selectedRecord.conflictCheckStatus.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {selectedRecord.conflictCheckNotes || 'Review completed against declared affiliations.'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">
                    Scope: {selectedRecord.conflictCheckScope}
                  </span>
                </div>

                {/* Geo Verification Coordinates */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <MapPin className="w-4 h-4 text-[#0f3c6e]" aria-hidden="true" />
                    <span>Geo-Verification Coordinates</span>
                  </div>
                  <p className="text-slate-600 text-[11px] font-mono">
                    Lat: {selectedRecord.geoLatitude || '23.2599° N'} • Long: {selectedRecord.geoLongitude || '77.4126° E'}
                  </p>
                  <span className="text-[10px] text-slate-500 block">
                    Campus geofence verified against municipal survey records.
                  </span>
                </div>
              </div>

              {/* Mandatory Pre-Inspection Readiness Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
                  Mandatory Pre-Inspection Readiness Checklist (Rule APH 2.5)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span>1. Faculty Biometric Roster Submitted</span>
                    {selectedRecord.readinessChecks.facultyRosterSubmitted ? (
                      <span className="text-emerald-700 font-bold">✓ Cleared</span>
                    ) : (
                      <span className="text-red-600 font-bold">✕ Pending</span>
                    )}
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span>2. Land Boundary & Geo-Tagging Verified</span>
                    {selectedRecord.readinessChecks.landGeoCoordsVerified ? (
                      <span className="text-emerald-700 font-bold">✓ Cleared</span>
                    ) : (
                      <span className="text-red-600 font-bold">✕ Pending</span>
                    )}
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span>3. Building Completion Certificate (PWD)</span>
                    {selectedRecord.readinessChecks.buildingCompletionCertUploaded ? (
                      <span className="text-emerald-700 font-bold">✓ Cleared</span>
                    ) : (
                      <span className="text-red-600 font-bold">✕ Pending</span>
                    )}
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span>4. Fire Safety NOC (State Fire Service)</span>
                    {selectedRecord.readinessChecks.fireSafetyNocValid ? (
                      <span className="text-emerald-700 font-bold">✓ Cleared</span>
                    ) : (
                      <span className="text-red-600 font-bold">✕ Pending</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Constituted Committee Experts Roster */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
                  Empanelled Expert Committee Members
                </h4>
                <div className="space-y-2">
                  {selectedRecord.committeeExperts.map((exp) => (
                    <div key={exp.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900">{exp.name}</div>
                        <div className="text-[11px] text-slate-600">{exp.designation} • {exp.institution} ({exp.state})</div>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-800 font-medium px-2 py-0.5 rounded">
                        {exp.specialization}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Console */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2.5">
                {(currentRole === 'EVC_COORDINATOR' || currentRole === 'REGIONAL_OFFICER' || currentRole === 'CENTRAL_ADMIN') ? (
                  <>
                    {selectedRecord.status === 'PENDING_SCHEDULE' && (
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="px-3.5 py-2 bg-[#0f3c6e] hover:bg-[#0a2540] text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Schedule EVC Inspection Visit</span>
                      </button>
                    )}

                    {selectedRecord.status === 'SCHEDULED' && (
                      <button
                        onClick={() => setShowOutcomeModal(true)}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Upload EVC Inspection Findings & Recommendation</span>
                      </button>
                    )}

                    {selectedRecord.status === 'REPORT_SUBMITTED' && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-950 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                        <span>Inspection report certified by committee members and transmitted to Executive Council.</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
                    <span>
                      Role <strong>{currentRole}</strong> has read-only observation status. Panel constitution & scheduling reserved for EVC Coordinator / Regional Officer (Rule APH 2.5).
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Schedule Visit */}
      {showScheduleModal && selectedRecord && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <h3 id="schedule-modal-title" className="text-sm font-bold text-[#0a2540] border-b border-slate-100 pb-2">
              Schedule Official Expert Visit (EVC)
            </h3>
            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Confirming date will issue automated travel notices to empanelled experts and campus liaison officer.
              </p>
              <div>
                <label htmlFor="visit-date-input" className="font-semibold text-slate-700 block mb-1">
                  Proposed Inspection Date & Time
                </label>
                <input
                  id="visit-date-input"
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onScheduleVisit(selectedRecord.id, scheduleDate);
                  setShowScheduleModal(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-[#0f3c6e] hover:bg-[#0a2540] text-white rounded font-semibold"
              >
                Confirm & Dispatch Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Submit Outcome */}
      {showOutcomeModal && selectedRecord && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="outcome-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4 border border-slate-200">
            <h3 id="outcome-modal-title" className="text-sm font-bold text-[#0a2540] border-b border-slate-100 pb-2">
              Record EVC Committee Recommendation
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="recommendation-select" className="font-semibold text-slate-700 block mb-1">
                  Statutory Recommendation
                </label>
                <select
                  id="recommendation-select"
                  value={outcomeRecommendation}
                  onChange={(e) => setOutcomeRecommendation(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-white"
                >
                  <option value="RECOMMENDED_FULL">Recommended Full Sanction (Zero Deficiencies)</option>
                  <option value="RECOMMENDED_WITH_CONDITIONS">Recommended Subject to Time-Bound Undertaking</option>
                  <option value="REJECTED_DEFICIENT">Not Recommended (Critical Infrastructure Deficit)</option>
                </select>
              </div>

              <div>
                <label htmlFor="remarks-input" className="font-semibold text-slate-700 block mb-1">
                  Committee Observations & Executive Summary
                </label>
                <textarea
                  id="remarks-input"
                  rows={4}
                  value={outcomeRemarks}
                  onChange={(e) => setOutcomeRemarks(e.target.value)}
                  placeholder="Summarize physical laboratory verification, faculty roster check, and library titles..."
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowOutcomeModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSubmitOutcome(selectedRecord.id, outcomeRecommendation, outcomeRemarks || 'Verified compliant on all counts.');
                  setShowOutcomeModal(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold"
              >
                Submit & Sign Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
