import React from 'react';
import { 
  LayoutDashboard, 
  GitBranch, 
  Users, 
  FileCheck, 
  CalendarClock, 
  AlertTriangle, 
  FileLock2 
} from 'lucide-react';

export type TabType = 
  | 'overview' 
  | 'workflow' 
  | 'evc' 
  | 'undertakings' 
  | 'documents' 
  | 'notifications' 
  | 'audit';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: {
    pendingWorkflow: number;
    evcQueued: number;
    overdueUndertakings: number;
    expiringDocs: number;
    escalatedAlerts: number;
  };
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, counts }) => {
  const tabs = [
    {
      id: 'overview' as TabType,
      label: 'Pendency & Workload Analytics',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'workflow' as TabType,
      label: 'Approval Workflow Engine',
      icon: GitBranch,
      badge: counts.pendingWorkflow,
      badgeColor: 'bg-[#0f3c6e] text-white',
    },
    {
      id: 'evc' as TabType,
      label: 'EVC Committee Dispatch',
      icon: Users,
      badge: counts.evcQueued > 0 ? counts.evcQueued : null,
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      id: 'undertakings' as TabType,
      label: 'Undertakings & Compliance',
      icon: FileCheck,
      badge: counts.overdueUndertakings > 0 ? `${counts.overdueUndertakings} overdue` : null,
      badgeColor: 'bg-red-600 text-white',
    },
    {
      id: 'documents' as TabType,
      label: 'Lease & Expiry Radar',
      icon: CalendarClock,
      badge: counts.expiringDocs > 0 ? counts.expiringDocs : null,
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      id: 'notifications' as TabType,
      label: 'Alerts & Escalation Matrix',
      icon: AlertTriangle,
      badge: counts.escalatedAlerts > 0 ? `${counts.escalatedAlerts} SLA` : null,
      badgeColor: 'bg-red-600 text-white',
    },
    {
      id: 'audit' as TabType,
      label: 'Cryptographic Audit Trail',
      icon: FileLock2,
      badge: 'SHA-256',
      badgeColor: 'bg-slate-700 text-emerald-300 font-mono',
    },
  ];

  return (
    <nav className="bg-[#0a2540] text-slate-200 border-b border-slate-800 shadow-sm overflow-x-auto">
      <div className="px-4 sm:px-6 flex space-x-1 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-amber-400 text-white bg-slate-800/80'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
