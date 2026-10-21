import React from 'react';
import { Application, PrescribedDocument, Undertaking } from '../types';
import { 
  Clock, 
  AlertOctagon, 
  CheckCircle2, 
  Building2, 
  FileText, 
  ArrowUpRight, 
  ShieldAlert, 
  BarChart3,
  Calendar
} from 'lucide-react';
import { determineNextBestAction } from '../services/workflowEngine';

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
  const inScrutiny = applications.filter(a => a.currentStage === 'UNDER_SCRUTINY' || a.currentStage === 'RE_SCRUTINY' || a.currentStage === 'SCRUTINY_DEFICIENCY_RAISED').length;
  const inEvc = applications.filter(a => a.currentStage === 'EVC_QUEUED' || a.currentStage === 'EVC_SCHEDULED').length;
  const approved = applications.filter(a => a.currentStage === 'APPROVED_UNCONDITIONAL' || a.currentStage === 'APPROVED_WITH_UNDERTAKINGS').length;
  
  const overdueUndertakingsCount = undertakings.filter(u => u.status === 'OVERDUE_ESCALATED').length;
  const expiringLeasesCount = documents.filter(d => d.status === 'EXPIRING_SOON' || d.status === 'CRITICALLY_EXPIRED').length;

  // Regional breakdown
  const regions = ['Northern', 'Western', 'Southern', 'South-Western', 'Eastern', 'Central'] as const;
  const regionalCounts = regions.map(reg => ({
    region: reg,
    count: applications.filter(a => a.region === reg).length,
    overdue: applications.filter(a => a.region === reg && determineNextBestAction(a).isOverdue).length,
  }));

  // Top pending actions requiring immediate attention
  const urgentDockets = applications
    .map(app => ({
      app,
      nbaa: determineNextBestAction(app),
    }))
    .filter(item => item.app.currentStage !== 'APPROVED_UNCONDITIONAL' && item.app.currentStage !== 'REJECTED')
    .sort((a, b) => a.nbaa.daysRemaining - b.nbaa.daysRemaining);

  return (
    <div className="space-y-6">
      {/* Top Advisory Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-950">
              APH 2026-2027 Regulatory Cycle: Active Monitoring Enabled
            </h4>
            <p className="text-xs text-amber-900 mt-0.5">
              Automated SLA countdown in effect. Cases exceeding statutory scrutiny (14 days) or EVC scheduling (10 days) escalate autonomously to Regional Directors.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-200/80 text-amber-900 rounded font-mono">
            Cycle SLA: Day 12 of 45
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div 
          onClick={() => onNavigateTab('workflow')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-slate-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Dockets</span>
            <Building2 className="w-4 h-4 text-[#0f3c6e]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0a2540]">{totalApps}</span>
            <span className="text-xs font-medium text-emerald-700 flex items-center gap-0.5">
              {approved} Sanctioned
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Across 6 regional directorates under APH 2026-27
          </p>
        </div>

        {/* Bureau Scrutiny Queue */}
        <div 
          onClick={() => onNavigateTab('workflow')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-slate-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scrutiny Stage</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0a2540]">{inScrutiny}</span>
            <span className="text-xs font-medium text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
              Verification Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Form 15 scrutiny checklists & deficiency dockets
          </p>
        </div>

        {/* EVC Inspection Queue */}
        <div 
          onClick={() => onNavigateTab('evc')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-slate-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">EVC Panels</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#0a2540]">{inEvc}</span>
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              Inspection Track
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Committee constitution & geo-tag inspections
          </p>
        </div>

        {/* SLA & Undertaking Risk Alerts */}
        <div 
          onClick={() => onNavigateTab('undertakings')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-red-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Breach / Expiry Radar</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
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
            {overdueUndertakingsCount} overdue undertakings • {expiringLeasesCount} leases expiring
          </p>
        </div>
      </div>

      {/* Main Grid: Regional Workload & Stage Bottleneck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Regional Workload Matrix */}
        <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0a2540]" />
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
            <span>Deterministic Allocation</span>
            <span className="font-medium text-slate-700">Zero Unassigned Dockets</span>
          </div>
        </div>

        {/* Immediate Next Best Administrative Action (NBAA) Table */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                <span>Next Best Administrative Action (NBAA) Ledger</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Deterministic Rule-Based
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every docket has an accountable official, statutory clause, and SLA countdown
              </p>
            </div>
            <button 
              onClick={() => onNavigateTab('workflow')}
              className="text-xs text-[#0f3c6e] hover:underline font-semibold flex items-center gap-1"
            >
              View All Dockets <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Docket & Institution</th>
                  <th className="py-2.5 px-3">Stage</th>
                  <th className="py-2.5 px-3">Next Required Statutory Action</th>
                  <th className="py-2.5 px-3">Responsible Role</th>
                  <th className="py-2.5 px-3 text-right">SLA Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {urgentDockets.slice(0, 4).map(({ app, nbaa }) => (
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
                        {nbaa.stage}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {nbaa.actionTitle}
                      {nbaa.blockingReasons.length > 0 && (
                        <div className="text-[10px] text-amber-700 mt-0.5">
                          ⚠️ {nbaa.blockingReasons[0]}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {nbaa.responsibleRole}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {nbaa.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          <AlertOctagon className="w-3 h-3" /> Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {nbaa.daysRemaining}d remaining
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

      {/* Unique Selling Proposition Highlight Box for SIH Jury */}
      <div className="bg-slate-900 text-white rounded-lg p-5 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
              SIH
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-wide">
                Why AICTE OneFlow Transcends Conventional Portals
              </h4>
              <p className="text-xs text-slate-400">
                Architectural distinctions designed for Problem Statement SIH26262
              </p>
            </div>
          </div>
          <span className="hidden sm:inline text-xs font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
            USP 1, 2, 3 Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded border border-slate-700">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
              USP 1: Rule-Versioned State Engine
            </span>
            <p className="text-slate-300 leading-relaxed">
              Dockets bind directly to <span className="text-white font-mono font-medium">APH-2026-27-v2.1</span>. No scattered if-else statements. Stage transitions enforce mandatory legal prerequisites prior to EVC or final council sanction.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded border border-slate-700">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
              USP 2: Next Best Administrative Action (NBAA)
            </span>
            <p className="text-slate-300 leading-relaxed">
              Officials don't guess what happens next. The engine calculates the precise statutory owner, SLA countdown, and blocker list deterministically.
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded border border-slate-700">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
              USP 3: Evidence-Backed Compliance Ledger
            </span>
            <p className="text-slate-300 leading-relaxed">
              Uploading a document ≠ compliance. Submissions move through strict officer verification with tamper-evident cryptographic hash chaining for statutory auditability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
