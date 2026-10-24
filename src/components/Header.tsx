import React from 'react';
import { Role } from '../types';
import { UserCheck, Bell, Database } from 'lucide-react';

interface HeaderProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  onOpenWalkthrough?: () => void;
  unreadAlertCount: number;
  onResetSeedData: () => void;
  backendConnected?: boolean;
}

const ROLE_METADATA: Record<Role, { label: string; department: string; clearance: string }> = {
  CENTRAL_ADMIN: {
    label: 'Member Secretary / Central HQ',
    department: 'AICTE Council Secretariat, New Delhi',
    clearance: 'Statutory Authority (L1)',
  },
  REGIONAL_OFFICER: {
    label: 'Regional Officer (RO Western/Northern)',
    department: 'Regional Office Approval Bureau',
    clearance: 'Regulatory Executive (L2)',
  },
  SCRUTINY_OFFICER: {
    label: 'Bureau Scrutiny Desk Officer',
    department: 'Document Verification & APH Bureau',
    clearance: 'Examiner (L3)',
  },
  EVC_COORDINATOR: {
    label: 'Expert Visit Committee (EVC) Desk',
    department: 'Inspection & Peer Review Directorate',
    clearance: 'Panel Coordinator (L3)',
  },
  INSTITUTION_REP: {
    label: 'Institutional Applicant (Principal/Registrar)',
    department: 'Technical Institution Portal',
    clearance: 'Applicant (External)',
  },
  STATUTORY_AUDITOR: {
    label: 'Central Vigilance & Statutory Auditor',
    department: 'CVC / CAG Oversight Directorate',
    clearance: 'Read-Only Cryptographic Audit',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onOpenWalkthrough,
  unreadAlertCount,
  onResetSeedData,
  backendConnected,
}) => {
  const roleInfo = ROLE_METADATA[currentRole];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm" role="banner">
      {/* Top Gov Tricolor Bar */}
      <div className="gov-tricolor-bar w-full" aria-hidden="true"></div>

      {/* Official Government Meta Strip */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white tracking-wide flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span>
            GOVERNMENT OF INDIA
          </span>
          <span className="text-slate-500" aria-hidden="true">|</span>
          <span className="hidden md:inline text-slate-400">Ministry of Education</span>
          <span className="hidden md:inline text-slate-500" aria-hidden="true">|</span>
          <span className="text-amber-400 font-medium">Smart India Hackathon 2026 (SIH26262)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-slate-400">
            Regulatory Baseline: <strong className="text-slate-200">APH 2024–2027 (Clause 2.3 Verified)</strong>
          </span>
          <span className="hidden lg:inline text-slate-500" aria-hidden="true">|</span>
          <span className="text-emerald-400 font-mono hidden sm:inline">IST (UTC+05:30)</span>
          <span className="hidden lg:inline text-slate-500" aria-hidden="true">|</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-700/50">
            <span className={`w-1.5 h-1.5 rounded-full ${backendConnected !== false ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {backendConnected !== false ? 'SQLite Relational: Active' : 'Offline Cache Mode'}
          </span>
          <span className="hidden lg:inline text-slate-500" aria-hidden="true">|</span>
          <button 
            onClick={onResetSeedData}
            title="Reset to deterministic seed dataset"
            aria-label="Reset to deterministic seed dataset"
            className="text-slate-300 hover:text-white flex items-center gap-1 transition-colors underline focus-visible:ring-1 focus-visible:ring-amber-400 rounded px-1"
          >
            <Database className="w-3 h-3" aria-hidden="true" /> Reset Data
          </button>
        </div>
      </div>

      {/* Main AICTE Emblem & Portal Header */}
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* AICTE Official Crest Icon */}
          <div className="w-12 h-12 rounded-lg bg-[#0a2540] text-amber-400 flex items-center justify-center shadow-md border border-slate-700 flex-shrink-0" aria-hidden="true">
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2L1 7l11 5 9-4.09V17h2V7L12 2zm0 8.9L4.24 7.5 12 4.1l7.76 3.4L12 10.9zm-7 3.65v4.54c0 2.21 3.58 4 8 4s8-1.79 8-4v-4.54l-8 3.64-8-3.64z"/>
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
                AICTE OneFlow
                <span className="bg-[#0f3c6e] text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded">
                  Explainable Action Engine
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              अखिल भारतीय तकनीकी शिक्षा परिषद • Statutory Approval Workflow Automation & Institutional Compliance Platform
            </p>
          </div>
        </div>

        {/* Action Controls & Persona Selector */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Persona Switcher Dropdown */}
          <div className="relative flex items-center bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
            <UserCheck className="w-4 h-4 text-[#0f3c6e] mr-2 flex-shrink-0" aria-hidden="true" />
            <div className="flex flex-col text-left mr-2">
              <label htmlFor="role-select" className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Simulated Role
              </label>
              <select
                id="role-select"
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as Role)}
                className="bg-transparent text-xs font-semibold text-[#0a2540] focus:outline-none cursor-pointer"
              >
                <option value="CENTRAL_ADMIN">Central Admin (Member Secretary)</option>
                <option value="REGIONAL_OFFICER">Regional Officer (RO)</option>
                <option value="SCRUTINY_OFFICER">Bureau Scrutiny Officer</option>
                <option value="EVC_COORDINATOR">EVC Coordinator (Panels)</option>
                <option value="INSTITUTION_REP">Institutional Applicant</option>
                <option value="STATUTORY_AUDITOR">Statutory Auditor (CVC/CAG)</option>
              </select>
            </div>
            <span className="hidden xl:inline text-[11px] text-slate-500 border-l border-slate-300 pl-2">
              {roleInfo.clearance}
            </span>
          </div>

          {/* Quick Notification Counter */}
          <div 
            className="relative p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
            title={`${unreadAlertCount} active alerts`}
            aria-label={`${unreadAlertCount} active alerts`}
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadAlertCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadAlertCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
