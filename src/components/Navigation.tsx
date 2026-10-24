import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  GitBranch, 
  Users, 
  FileCheck, 
  CalendarClock, 
  AlertTriangle, 
  FileLock2,
  ChevronLeft,
  ChevronRight,
  HelpCircle
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenWalkthrough?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  activeTab, 
  onTabChange, 
  counts,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  onOpenWalkthrough
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(prev => !prev));

  const tabs = [
    {
      id: 'overview' as TabType,
      label: 'Pendency & Workload Analytics',
      shortLabel: 'Analytics',
      icon: LayoutDashboard,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'workflow' as TabType,
      label: 'Approval Workflow Engine',
      shortLabel: 'Workflow',
      icon: GitBranch,
      badge: counts.pendingWorkflow > 0 ? counts.pendingWorkflow : null,
      badgeColor: 'bg-[#0f3c6e] text-amber-300 border border-amber-400/30',
    },
    {
      id: 'evc' as TabType,
      label: 'EVC Committee Dispatch',
      shortLabel: 'EVC Panels',
      icon: Users,
      badge: counts.evcQueued > 0 ? counts.evcQueued : null,
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      id: 'undertakings' as TabType,
      label: 'Undertakings & Compliance',
      shortLabel: 'Compliance',
      icon: FileCheck,
      badge: counts.overdueUndertakings > 0 ? `${counts.overdueUndertakings} overdue` : null,
      badgeColor: 'bg-red-600 text-white',
    },
    {
      id: 'documents' as TabType,
      label: 'Lease & Expiry Radar',
      shortLabel: 'Radar',
      icon: CalendarClock,
      badge: counts.expiringDocs > 0 ? counts.expiringDocs : null,
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      id: 'notifications' as TabType,
      label: 'Alerts & Escalation Matrix',
      shortLabel: 'Alerts',
      icon: AlertTriangle,
      badge: counts.escalatedAlerts > 0 ? `${counts.escalatedAlerts} SLA` : null,
      badgeColor: 'bg-red-600 text-white animate-pulse',
    },
    {
      id: 'audit' as TabType,
      label: 'Cryptographic Audit Trail',
      shortLabel: 'Audit Vault',
      icon: FileLock2,
      badge: 'SHA-256',
      badgeColor: 'bg-slate-800 text-emerald-400 font-mono text-[9px] border border-emerald-500/30',
    },
  ];

  return (
    <aside 
      className={`bg-[#0a2540] text-slate-200 border-r border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out select-none z-30 ${
        isCollapsed ? 'w-16 sm:w-20' : 'w-64 lg:w-72'
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Top Header / Toggle Bar */}
      <div className={`py-3 border-b border-slate-800/80 flex items-center ${
        isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      }`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Regulatory Modules
            </span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand side navigation' : 'Collapse side navigation'}
          aria-label={isCollapsed ? 'Expand side navigation' : 'Collapse side navigation'}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors focus-visible:ring-1 focus-visible:ring-amber-400"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-amber-400" />
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
              <span className="text-[10px] uppercase font-semibold">Collapse</span>
              <ChevronLeft className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>

      {/* Navigation Items List */}
      <nav className="flex-1 py-3 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <div key={tab.id} className="relative group">
              <button
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center transition-all rounded-lg text-xs font-medium ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#0f3c6e] text-white shadow-sm border-l-4 border-amber-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-l-4 border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
              >
                <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <div className="relative flex items-center justify-center">
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />
                    {/* Collapsed notification indicator badge */}
                    {isCollapsed && tab.badge !== null && (
                      <span className="absolute -top-1.5 -right-2 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0a2540]" />
                    )}
                  </div>

                  {!isCollapsed && (
                    <span className="truncate text-left">{tab.label}</span>
                  )}
                </div>

                {!isCollapsed && tab.badge !== null && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>

              {/* Floating Tooltip when Collapsed */}
              {isCollapsed && (
                <div className="fixed left-16 sm:left-20 ml-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 transform -translate-y-9">
                  <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md shadow-xl border border-slate-700 whitespace-nowrap flex items-center gap-2">
                    <span className="font-medium">{tab.label}</span>
                    {tab.badge !== null && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${tab.badgeColor}`}>
                        {tab.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Footer Section */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/40">
        {onOpenWalkthrough && (
          <button
            onClick={onOpenWalkthrough}
            title="Interactive SIH Walkthrough Tour"
            aria-label="Interactive SIH Walkthrough Tour"
            className={`w-full flex items-center rounded-md transition-all text-xs text-amber-400/90 hover:text-amber-300 hover:bg-slate-800/60 ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-2 px-3 py-2'
            }`}
          >
            <HelpCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            {!isCollapsed && (
              <span className="text-[11px] font-medium truncate">SIH Walkthrough Tour</span>
            )}
          </button>
        )}

        {!isCollapsed && (
          <div className="px-3 pt-2 text-[10px] text-slate-500 font-mono text-center border-t border-slate-800/40 mt-1">
            APH 2024–27 Compliance
          </div>
        )}
      </div>
    </aside>
  );
};
