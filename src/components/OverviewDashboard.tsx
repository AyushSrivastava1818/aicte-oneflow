import React from 'react';
import { Application, PrescribedDocument, Undertaking } from '../types';
import { 
  Clock, 
  AlertOctagon, 
  Building2, 
  FileText, 
  ArrowUpRight, 
  ShieldAlert, 
  BarChart3,
  Calendar
} from 'lucide-react';
import { generateExplainableCaseAction } from '../services/workflowEngine';

interface OverviewDashboardProps {
  applications: Application[];
  undertakings: Undertaking[];
  documents: PrescribedDocument[];
  onSelectDocket: (docketNumber: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  applications,
  undertakings,
  documents,
  onSelectDocket,
  onNavigateTab,
}) => {
  // Aggregate statistics
  const totalApps = applications.length;
  const inScrutiny = applications.filter(a => 
    a.currentStage === 'UNDER_SCRUTINY' || 
    a.currentStage === 'RE_SCRUTINY' || 
    a.currentStage === 'SCRUTINY_DEFICIENCY_RAISED'
  ).length;
  const inEvc = applications.filter(a => 
    a.currentStage === 'EVC_QUEUED' || 
    a.currentStage === 'EVC_SCHEDULED'
  ).length;
  const approved = applications.filter(a => 
    a.currentStage === 'APPROVED_UNCONDITIONAL' || 
    a.currentStage === 'APPROVED_WITH_UNDERTAKINGS'
  ).length;
  
  const overdueUndertakingsCount = undertakings.filter(u => u.status === 'OVERDUE_ESCALATED').length;
  const expiringLeasesCount = documents.filter(d => d.status === 'EXPIRING_SOON' || d.status === 'CRITICALLY_EXPIRED').length;

  // Regional breakdown
  const regions = ['Northern', 'Western', 'Southern', 'South-Western', 'Eastern', 'Central'] as const;
  const regionalCounts = regions.map(reg => ({
    region: reg,
    count: applications.filter(a => a.region === reg).length,
    overdue: applications.filter(a => a.region === reg && generateExplainableCaseAction(a).isOverdue).length,
  }));

  // Top pending actions requiring immediate attention
  const urgentActions = applications
    .map(app => ({
      app,
      action: generateExplainableCaseAction(app),
    }))
    .filter(item => item.app.currentStage !== 'APPROVED_UNCONDITIONAL' && item.app.currentStage !== 'REJECTED')
    .sort((a, b) => a.action.daysRemaining - b.action.daysRemaining);

  return (
    <div className="space-y-6">
      {/* Top Advisory Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-amber-950">
              AICTE Regulatory Cycle: Active Surveillance & Explainable Workflow Engine
            </h2>
            <p className="text-xs text-amber-900 mt-0.5">
              Deterministic SLA tracking enabled. Dockets evaluated against AICTE Approval Process Handbook (APH 2024–2027) standards.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded font-mono">
            Environment: Seeded Demo (Deterministic)
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Operational Metrics Overview">
        {/* Total Applications */}
        <div 
          onClick={() => onNavigateTab('workflow')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onNavigateTab('workflow'); }}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Dockets</span>
            <Building2 className="w-4 h-4 text-[#0f3c6e]" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0a2540]">{totalApps}</span>
            <span className="text-xs font-medium text-emerald-700 flex items-center gap-0.5">
              {approved} Sanctioned
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Total active cases distributed across 6 AICTE Regional Directorates
          </p>
        </div>

        {/* Bureau Scrutiny Queue */}
        <div 
          onClick={() => onNavigateTab('workflow')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onNavigateTab('workflow'); }}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scrutiny Stage</span>
            <FileText className="w-4 h-4 text-amber-600" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0a2540]">{inScrutiny}</span>
            <span className="text-xs font-medium text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
              Active Verification
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Cases undergoing Form 15 checklist examination & Form 17 deficiency notes
          </p>
        </div>

        {/* EVC Inspection Queue */}
        <div 
          onClick={() => onNavigateTab('evc')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onNavigateTab('evc'); }}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">EVC Panels</span>
            <Clock className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0a2540]">{inEvc}</span>
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              Inspection Track
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Peer committee constitution, conflict review, and inspection scheduling
          </p>
        </div>

        {/* SLA & Undertaking Risk Alerts */}
        <div 
          onClick={() => onNavigateTab('undertakings')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onNavigateTab('undertakings'); }}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-red-400 focus-visible:ring-2 focus-visible:ring-blue-600 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Breach / Expiry Radar</span>
            <AlertOctagon className="w-4 h-4 text-red-600" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600">
              {overdueUndertakingsCount + expiringLeasesCount}
            </span>
            <span className="text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
              Immediate Action
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {overdueUndertakingsCount} overdue undertakings • {expiringLeasesCount} leases approaching expiry
          </p>
        </div>
      </div>

      {/* Main Grid: Regional Workload & Explainable Case Action Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Regional Workload Matrix */}
        <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0a2540]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[#0a2540]">Regional Directorate Pendency</h3>
            </div>
            <span className="text-[11px] text-slate-500">6 AICTE Regions</span>
          </div>

          <div className="space-y-3">
            {regionalCounts.map(item => (
              <div key={item.region} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{item.region} Region</span>
                  <span className="font-mono text-slate-600">
                    {item.count} dockets {item.overdue > 0 && <span className="text-red-600 font-bold">({item.overdue} SLA breach)</span>}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.overdue > 0 ? 'bg-amber-600' : 'bg-[#0f3c6e]'}`}
                    style={{ width: `${Math.min(100, (item.count / 3) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Allocation Engine</span>
            <span className="font-medium text-slate-700">Zero Unassigned Dockets</span>
          </div>
        </div>

        {/* Explainable Case Action Ledger Table */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                <span>Explainable Case Action Ledger</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Deterministic Rule-Based
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every docket has an accountable official, regulatory clause source, and explainable blockers
              </p>
            </div>
            <button 
              onClick={() => onNavigateTab('workflow')}
              className="text-xs text-[#0f3c6e] hover:underline font-semibold flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-blue-600 rounded p-1"
            >
              Workflow Console <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Explainable Case Actions">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th scope="col" className="py-2.5 px-3">Docket & Institution</th>
                  <th scope="col" className="py-2.5 px-3">State</th>
                  <th scope="col" className="py-2.5 px-3">Next Required Action</th>
                  <th scope="col" className="py-2.5 px-3">Statutory Rule Source</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Deadline Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {urgentActions.slice(0, 4).map(({ app, action }) => (
                  <tr 
                    key={app.id} 
                    onClick={() => onSelectDocket(app.docketNumber)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#0a2540] hover:text-blue-700">
                        {app.docketNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {app.institutionName}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {action.workflowState.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-medium text-slate-800 max-w-xs">
                      <div>{action.recommendedAction}</div>
                      {action.blockers.length > 0 && (
                        <div className="text-[10px] text-amber-700 mt-0.5">
                          ⚠️ {action.blockers[0]}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 block">
                        {action.regulatorySource.clause}
                      </span>
                      <span className="text-[9px] text-emerald-800 font-semibold block mt-0.5">
                        {action.regulatorySource.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {action.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          <AlertOctagon className="w-3 h-3" aria-hidden="true" /> Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                          <Calendar className="w-3 h-3 text-slate-400" aria-hidden="true" />
                          {action.daysRemaining}d left
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Core Positioning Callout */}
      <div className="bg-slate-900 text-white rounded-lg p-5 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs" aria-hidden="true">
              SIH
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-wide">
                Core Positioning: Explainable Case Action Ledger
              </h4>
              <p className="text-xs text-slate-400">
                "Every case has a next action. Every action has an owner. Every rule has a source. Every change has evidence."
              </p>
            </div>
          </div>
          <span className="hidden sm:inline text-xs font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
            APH 2024-27 Verified Rules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded border border-slate-700">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
              1. Deterministic Action Guidance
            </span>
            <p className="text-slate-300 leading-relaxed">
              No guesswork or opaque AI approvals. The ledger explicitly determines the accountable official, prerequisite blockers, and SLA countdowns based on published AICTE regulations.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded border border-slate-700">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
              2. Sourced Regulatory Provenance
            </span>
            <p className="text-slate-300 leading-relaxed">
              Every workflow transition is bound to an authoritative handbook clause with clear provenance status (<span className="text-emerald-300 font-mono">VERIFIED_SOURCE</span> vs. <span className="text-amber-300 font-mono">CONFIGURED_DEMO</span>).
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded border border-slate-700">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
              3. Evidence-Backed Integrity
            </span>
            <p className="text-slate-300 leading-relaxed">
              Submissions require authoritative officer verification. State transitions and observations are immutably preserved on a SHA-256 hash-chained audit ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
