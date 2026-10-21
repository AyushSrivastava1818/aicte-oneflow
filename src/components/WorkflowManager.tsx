import React, { useState } from 'react';
import { Application, Role, WorkflowStage } from '../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  ArrowRight, 
  FileCheck2, 
  AlertOctagon, 
  RotateCcw,
  PlusCircle
} from 'lucide-react';
import { generateExplainableCaseAction, validateStateTransition } from '../services/workflowEngine';

interface WorkflowManagerProps {
  applications: Application[];
  selectedDocket: string | null;
  onSelectDocket: (docketNumber: string | null) => void;
  currentRole: Role;
  onAdvanceStage: (appId: string, targetStage: WorkflowStage, reason: string) => Promise<{ success: boolean; message: string }>;
  onResolveDeficiency: (appId: string, defId: string) => void;
  onAddDeficiency: (appId: string, clause: string, description: string) => void;
}

const STAGES_ORDER: { stage: WorkflowStage; label: string }[] = [
  { stage: 'APPLICATION_SUBMITTED', label: '1. Submitted' },
  { stage: 'UNDER_SCRUTINY', label: '2. Scrutiny' },
  { stage: 'SCRUTINY_CLEARED', label: '3. Scrutiny Cleared' },
  { stage: 'EVC_QUEUED', label: '4. EVC Queued' },
  { stage: 'EVC_SCHEDULED', label: '5. Inspection' },
  { stage: 'EVC_COMPLETED', label: '6. Report In' },
  { stage: 'SAC_SHC_REVIEW', label: '7. Appeals/SAC' },
  { stage: 'APPROVED_WITH_UNDERTAKINGS', label: '8. Approved (Cond.)' },
  { stage: 'APPROVED_UNCONDITIONAL', label: '9. Final Sanction' },
];

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({
  applications,
  selectedDocket,
  onSelectDocket,
  currentRole,
  onAdvanceStage,
  onResolveDeficiency,
  onAddDeficiency,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');
  const [activeDossierTab, setActiveDossierTab] = useState<'ACTION' | 'EVIDENCE' | 'DEFICIENCIES'>('ACTION');
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [transitionSuccess, setTransitionSuccess] = useState<string | null>(null);

  // New Deficiency Modal state
  const [showAddDefModal, setShowAddDefModal] = useState(false);
  const [defClause, setDefClause] = useState('APH Clause 3.4(b)');
  const [defDesc, setDefDesc] = useState('');

  // Selected application object
  const currentApp = applications.find(a => a.docketNumber === selectedDocket) || applications[0];

  // Filtering
  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.docketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.institutionCode.includes(searchQuery);
    const matchesRegion = selectedRegion === 'ALL' || app.region === selectedRegion;
    const matchesStage = selectedStageFilter === 'ALL' || app.currentStage === selectedStageFilter;
    return matchesSearch && matchesRegion && matchesStage;
  });

  const handleStageTransition = async (targetStage: WorkflowStage, reason: string) => {
    setTransitionError(null);
    setTransitionSuccess(null);

    const validation = validateStateTransition(currentApp, targetStage, currentRole);
    if (!validation.valid) {
      const blockerList = validation.blockers ? ` Blockers: ${validation.blockers.join('; ')}` : '';
      setTransitionError(`${validation.message}${blockerList}`);
      return;
    }

    const res = await onAdvanceStage(currentApp.id, targetStage, reason);
    if (res.success) {
      setTransitionSuccess(res.message);
      setTimeout(() => setTransitionSuccess(null), 4000);
    } else {
      setTransitionError(res.message);
    }
  };

  const actionLedger = currentApp ? generateExplainableCaseAction(currentApp) : null;

  return (
    <div className="space-y-6">
      {/* Search and Filters Strip */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search docket number, institution name, or AICTE institute code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search applications"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            aria-label="Filter by AICTE Region"
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">All Regions (National)</option>
            <option value="Northern">Northern (Noida/Kanpur)</option>
            <option value="Western">Western (Mumbai/Bhopal)</option>
            <option value="Southern">Southern (Chennai)</option>
            <option value="South-Western">South-Western (Bengaluru)</option>
            <option value="Eastern">Eastern (Kolkata)</option>
            <option value="Central">Central (Bhopal)</option>
          </select>

          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            aria-label="Filter by Processing Stage"
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">All Processing Stages</option>
            <option value="UNDER_SCRUTINY">Under Scrutiny</option>
            <option value="SCRUTINY_DEFICIENCY_RAISED">Deficiency Raised</option>
            <option value="EVC_QUEUED">EVC Queued</option>
            <option value="EVC_SCHEDULED">EVC Scheduled</option>
            <option value="APPROVED_WITH_UNDERTAKINGS">Approved (Undertakings)</option>
            <option value="APPROVED_UNCONDITIONAL">Final Sanction</option>
          </select>

          <span className="text-[11px] text-slate-500 font-semibold px-2 py-1 bg-slate-100 rounded">
            {filteredApps.length} Dockets Found
          </span>
        </div>
      </div>

      {/* Main Split View: Dockets Sidebar + Active Docket Inspection Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dockets List (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col h-[750px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
              Assigned Dockets
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Regulatory Baseline: APH 2024–27
            </span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100" role="list">
            {filteredApps.map((app) => {
              const isSelected = app.docketNumber === currentApp?.docketNumber;
              const action = generateExplainableCaseAction(app);

              return (
                <div
                  key={app.id}
                  onClick={() => onSelectDocket(app.docketNumber)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSelectDocket(app.docketNumber); }}
                  className={`p-3.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-[#0f3c6e]'
                      : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-[#0a2540]">
                      {app.docketNumber}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-slate-200 text-slate-700">
                      {app.region}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-900 line-clamp-1 mb-1">
                    {app.institutionName}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span className="truncate max-w-[170px] text-slate-600">
                      {app.applicationType}
                    </span>
                    {action.isOverdue ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.2 rounded">
                        SLA Overdue
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono">
                        {action.daysRemaining}d left
                      </span>
                    )}
                  </div>

                  {app.deficiencies.some(d => !d.resolved) && (
                    <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" aria-hidden="true" />
                      <span>{app.deficiencies.filter(d => !d.resolved).length} Unresolved Deficiency</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Docket Inspection & Explainable Action Console (8 Cols) */}
        {currentApp && (
          <div className="lg:col-span-8 space-y-5">
            {/* Docket Header Card */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#0a2540]">
                      {currentApp.institutionName}
                    </h3>
                    <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-mono">
                      ID: {currentApp.institutionCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                    <span>Docket: <strong className="font-mono text-slate-800">{currentApp.docketNumber}</strong></span>
                    <span>•</span>
                    <span>{currentApp.state}</span>
                    <span>•</span>
                    <span>Academic Year: {currentApp.academicYear}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-500">Route Authorization</div>
                  <div className="text-xs font-mono font-bold text-[#0f3c6e] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-0.5">
                    {currentApp.route}
                  </div>
                </div>
              </div>

              {/* Workflow Stepper Bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
                  <span>Lifecycle Stage Progression</span>
                  <span className="font-semibold text-slate-700">Current: {currentApp.currentStage}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1" role="progressbar" aria-label="Application stage progression">
                  {STAGES_ORDER.map((s, idx) => {
                    const isPassed = STAGES_ORDER.findIndex(x => x.stage === currentApp.currentStage) > idx;
                    const isCurrent = s.stage === currentApp.currentStage;

                    return (
                      <div
                        key={s.stage}
                        className={`text-center p-1.5 rounded text-[10px] font-semibold border transition-all ${
                          isCurrent
                            ? 'bg-[#0a2540] text-amber-300 border-[#0a2540] shadow-xs'
                            : isPassed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {isPassed && '✓ '}
                        {s.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-Tabs: Action Ledger / Evidence / Deficiencies */}
              <div className="flex border-b border-slate-200 gap-1 text-xs">
                <button
                  onClick={() => setActiveDossierTab('ACTION')}
                  className={`py-2 px-3 font-semibold border-b-2 transition-all ${
                    activeDossierTab === 'ACTION'
                      ? 'border-[#0f3c6e] text-[#0a2540]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Explainable Action Ledger
                </button>
                <button
                  onClick={() => setActiveDossierTab('EVIDENCE')}
                  className={`py-2 px-3 font-semibold border-b-2 transition-all ${
                    activeDossierTab === 'EVIDENCE'
                      ? 'border-[#0f3c6e] text-[#0a2540]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Prerequisites & Evidence Dossier
                </button>
                <button
                  onClick={() => setActiveDossierTab('DEFICIENCIES')}
                  className={`py-2 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeDossierTab === 'DEFICIENCIES'
                      ? 'border-[#0f3c6e] text-[#0a2540]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Deficiencies (Form 17)</span>
                  {currentApp.deficiencies.length > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                      {currentApp.deficiencies.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab 1: Explainable Case Action Ledger */}
              {activeDossierTab === 'ACTION' && actionLedger && (
                <div className="space-y-4">
                  <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
                        <span className="font-bold uppercase tracking-wider text-amber-400 text-[10px]">
                          Deterministic Next Best Action (Rule Engine)
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-300">
                        Deadline: {actionLedger.isOverdue ? (
                          <strong className="text-red-400">BREACHED ({Math.abs(actionLedger.daysRemaining)}d ago)</strong>
                        ) : (
                          <span className="text-emerald-300">{actionLedger.daysRemaining} days remaining</span>
                        )}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {actionLedger.recommendedAction}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        <strong>Rationale:</strong> {actionLedger.actionRationale}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Statutory Owner Role:</span>
                        <span className="font-mono font-bold text-amber-300">{actionLedger.responsibleRole}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">({actionLedger.assignedOfficer})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Rule Provenance:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-slate-200">{actionLedger.regulatorySource.clause}</span>
                          <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-bold">
                            {actionLedger.regulatorySource.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800">
                      <strong>Deadline Provenance:</strong> {actionLedger.deadlineCalculationExplanation}
                    </div>
                  </div>

                  {/* Active Blockers Notice */}
                  {actionLedger.blockers.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950 space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                        <span>Action Blockers Identified ({actionLedger.blockers.length}):</span>
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 pl-2 text-amber-900 text-[11px]">
                        {actionLedger.blockers.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Prerequisites & Evidence Dossier */}
              {activeDossierTab === 'EVIDENCE' && actionLedger && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
                      Mandatory APH Prerequisites
                    </h4>
                    <div className="space-y-1.5">
                      {actionLedger.prerequisites.map((p) => (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded border text-xs flex items-center justify-between gap-2 ${
                            p.satisfied
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                              : 'bg-red-50/70 border-red-200 text-red-950'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold block">{p.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{p.clauseReference}</span>
                            {p.blockerDetail && (
                              <p className="text-[11px] text-red-800 font-medium">{p.blockerDetail}</p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            p.satisfied ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                          }`}>
                            {p.satisfied ? '✓ Satisfied' : '✕ Blocked'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
                      Submitted Supporting Evidence
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      {actionLedger.supportingEvidence.map((ev, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800">{ev.name}</span>
                            <span className="text-[11px] text-slate-500 block">{ev.type}</span>
                            {ev.notes && <span className="text-[10px] text-slate-600 italic block mt-0.5">{ev.notes}</span>}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            ev.status === 'VERIFIED_GENUINE' ? 'bg-emerald-100 text-emerald-900' :
                            ev.status === 'RETURNED_DEFICIENT' ? 'bg-red-100 text-red-900' :
                            'bg-blue-100 text-blue-900'
                          }`}>
                            {ev.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Deficiencies (Form 17) */}
              {activeDossierTab === 'DEFICIENCIES' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
                      Scrutiny Deficiencies & Observation Checklist (Form 17)
                    </h4>
                    {(currentRole === 'SCRUTINY_OFFICER' || currentRole === 'REGIONAL_OFFICER' || currentRole === 'CENTRAL_ADMIN') && (
                      <button
                        onClick={() => setShowAddDefModal(true)}
                        className="text-xs text-[#0f3c6e] hover:text-blue-900 font-semibold flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-blue-600 rounded p-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Flag New Deficiency</span>
                      </button>
                    )}
                  </div>

                  {currentApp.deficiencies.length === 0 ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                      <span>No active deficiencies recorded. All APH checklist items fully validated.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentApp.deficiencies.map((def) => (
                        <div
                          key={def.id}
                          className={`p-3 rounded border text-xs flex flex-wrap items-center justify-between gap-2 ${
                            def.resolved
                              ? 'bg-slate-50 border-slate-200 text-slate-500'
                              : 'bg-amber-50 border-amber-200 text-amber-950'
                          }`}
                        >
                          <div className="space-y-1 max-w-[80%]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#0a2540]">{def.clause}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                def.severity === 'CRITICAL' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                              }`}>
                                {def.severity}
                              </span>
                              {def.resolved && (
                                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 rounded font-bold">
                                  Resolved
                                </span>
                              )}
                            </div>
                            <p className="text-xs">{def.description}</p>
                            <span className="text-[10px] text-slate-500 block">
                              Flagged by {def.raisedBy} on {new Date(def.raisedAt).toLocaleDateString()}
                            </span>
                          </div>

                          {!def.resolved && (
                            <button
                              onClick={() => onResolveDeficiency(currentApp.id, def.id)}
                              className="text-xs px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium shadow-xs"
                            >
                              Mark Rectified
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Status & Feedback Alerts */}
              {transitionError && (
                <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded-r text-xs text-red-900 flex items-start gap-2" role="alert">
                  <AlertOctagon className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <strong className="font-bold">Statutory Transition Guard / Prerequisite Block:</strong>
                    <p className="mt-0.5">{transitionError}</p>
                  </div>
                </div>
              )}

              {transitionSuccess && (
                <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r text-xs text-emerald-900 flex items-start gap-2" role="status">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <strong className="font-bold">Workflow State Transition Committed:</strong>
                    <p className="mt-0.5">{transitionSuccess}</p>
                  </div>
                </div>
              )}

              {/* State Transition Actions Console */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
                    Statutory Stage Execution Console
                  </h4>
                  <span className="text-xs text-slate-500">
                    Executing as: <strong className="text-slate-800">{currentRole}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {currentApp.currentStage === 'APPLICATION_SUBMITTED' && (
                    <button
                      onClick={() => handleStageTransition('UNDER_SCRUTINY', 'Desk officer accepted application for scrutiny')}
                      className="px-3.5 py-2 bg-[#0f3c6e] hover:bg-[#0a2540] text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span>Begin Scrutiny Verification</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}

                  {currentApp.currentStage === 'UNDER_SCRUTINY' && (
                    <>
                      <button
                        onClick={() => handleStageTransition('SCRUTINY_CLEARED', 'Scrutiny certified cleared with zero deficiencies')}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Certify Scrutiny Cleared (Form 15)</span>
                      </button>

                      <button
                        onClick={() => handleStageTransition('SCRUTINY_DEFICIENCY_RAISED', 'Issued Form 17 Deficiency Note to Institution')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Issue Form 17 Deficiency Note</span>
                      </button>
                    </>
                  )}

                  {currentApp.currentStage === 'SCRUTINY_DEFICIENCY_RAISED' && (
                    <button
                      onClick={() => handleStageTransition('RE_SCRUTINY', 'Institution submitted compliance documents for re-scrutiny')}
                      className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Submit Rectifications for Re-Scrutiny</span>
                    </button>
                  )}

                  {currentApp.currentStage === 'RE_SCRUTINY' && (
                    <button
                      onClick={() => handleStageTransition('SCRUTINY_CLEARED', 'Re-Scrutiny verified rectifications and cleared docket')}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Accept Rectifications & Clear Scrutiny</span>
                    </button>
                  )}

                  {currentApp.currentStage === 'SCRUTINY_CLEARED' && (
                    <>
                      {currentApp.route === 'ROUTE_EOA' ? (
                        <button
                          onClick={() => handleStageTransition('APPROVED_WITH_UNDERTAKINGS', 'EoA granted with statutory post-approval undertakings')}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Sanction Extension of Approval (EoA)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStageTransition('EVC_QUEUED', 'Queued for Expert Visit Committee panel scheduling')}
                          className="px-3.5 py-2 bg-[#0f3c6e] hover:bg-[#0a2540] text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                          <span>Queue for EVC Committee Dispatch</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </>
                  )}

                  {currentApp.currentStage === 'EVC_QUEUED' && (
                    <button
                      onClick={() => handleStageTransition('EVC_SCHEDULED', 'EVC Panel constituted and inspection date confirmed')}
                      className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span>Confirm Committee & Schedule Date</span>
                    </button>
                  )}

                  {currentApp.currentStage === 'EVC_SCHEDULED' && (
                    <button
                      onClick={() => handleStageTransition('EVC_COMPLETED', 'EVC Inspection report and geotagged matrix uploaded')}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Upload & Verify EVC Outcome Report</span>
                    </button>
                  )}

                  {currentApp.currentStage === 'EVC_COMPLETED' && (
                    <button
                      onClick={() => handleStageTransition('APPROVED_WITH_UNDERTAKINGS', 'Council approved with conditional undertakings')}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Sanction Approval Order (with Undertakings)</span>
                    </button>
                  )}

                  {currentApp.currentStage === 'APPROVED_WITH_UNDERTAKINGS' && (
                    <button
                      onClick={() => handleStageTransition('APPROVED_UNCONDITIONAL', 'All statutory undertakings fulfilled and certified')}
                      className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Seal Docket as Final Unconditional Sanction</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Note: In compliance with AICTE guidelines, state transitions are validated against prerequisites and logged to the SHA-256 hash-chained audit ledger.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Flag New Deficiency */}
      {showAddDefModal && currentApp && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deficiency-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="deficiency-modal-title" className="text-sm font-bold text-[#0a2540]">
                Flag Statutory Deficiency (Form 17 Memorandum)
              </h3>
              <button 
                onClick={() => setShowAddDefModal(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 text-xs p-1 rounded"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="def-clause-select" className="font-semibold text-slate-700 block mb-1">
                  Relevant APH Statutory Clause
                </label>
                <select
                  id="def-clause-select"
                  value={defClause}
                  onChange={(e) => setDefClause(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-white"
                >
                  <option value="APH Clause 3.4(b)">Clause 3.4(b) - Land Lease Continuity (30-year Norm)</option>
                  <option value="APH Clause 4.12(b)">Clause 4.12(b) - Fire & Life Safety Final NOC</option>
                  <option value="APH Clause 7.4(a)">Clause 7.4(a) - Faculty Cadre Ratio 1:15</option>
                  <option value="APH Clause 2.8">Clause 2.8 - Affiliating University NOC & Syllabus Alignment</option>
                </select>
              </div>

              <div>
                <label htmlFor="def-desc-input" className="font-semibold text-slate-700 block mb-1">
                  Observation / Deficiency Note (Mandatory Reason)
                </label>
                <textarea
                  id="def-desc-input"
                  rows={4}
                  value={defDesc}
                  onChange={(e) => setDefDesc(e.target.value)}
                  placeholder="Detail the exact deficiency observed during document scrutiny or physical verification..."
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAddDefModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                disabled={!defDesc.trim()}
                onClick={() => {
                  onAddDeficiency(currentApp.id, defClause, defDesc.trim());
                  setShowAddDefModal(false);
                  setDefDesc('');
                }}
                className="px-3.5 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold disabled:opacity-50"
              >
                Record Deficiency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
