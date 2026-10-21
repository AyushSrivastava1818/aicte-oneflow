import React from 'react';
import { Role } from '../types';
import { ShieldCheck, UserCheck, Play, Bell, Database } from 'lucide-react';

interface HeaderProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  onOpenWalkthrough: () => void;
  unreadAlertCount: number;
  onResetSeedData: () => void;
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
}) => {
  const roleInfo = ROLE_METADATA[currentRole];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Gov Tricolor Bar */}
      <div className="gov-tricolor-bar w-full"></div>

      {/* Official Government Meta Strip */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white tracking-wide flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            GOVERNMENT OF INDIA
          </span>
          <span className="text-slate-500">|</span>
          <span className="hidden md:inline text-slate-400">Ministry of Education</span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="text-amber-400 font-medium">Smart India Hackathon 2026 (SIH26262)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-slate-400">
            Regulatory Baseline: <strong className="text-slate-200">APH 2026-2027 (v2.1)</strong>
          </span>
          <span className="hidden lg:inline text-slate-500">|</span>
          <span className="hidden lg:inline text-emerald-400 font-mono">SHA-256 Ledger: ACTIVE</span>
          <button 
            onClick={onResetSeedData}
            title="Reset to official seed dataset"
            className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors underline"
          >
            <Database className="w-3 h-3" /> Reset Data
          </button>
        </div>
      </div>

      {/* Main AICTE Emblem & Portal Header */}
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* AICTE Official Crest Icon */}
          <div className="w-12 h-12 rounded-lg bg-[#0a2540] text-amber-400 flex items-center justify-center shadow-md border border-slate-700 flex-shrink-0">
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L1 7l11 5 9-4.09V17h2V7L12 2zm0 8.9L4.24 7.5 12 4.1l7.76 3.4L12 10.9zm-7 3.65v4.54c0 2.21 3.58 4 8 4s8-1.79 8-4v-4.54l-8 3.64-8-3.64z"/>
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
                AICTE OneFlow
                <span className="bg-[#0f3c6e] text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded">
                  APH 2026-27 Engine
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
          {/* SIH Judging Walkthrough Launcher */}
          <button
            onClick={onOpenWalkthrough}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded shadow-sm transition-all focus:ring-2 focus:ring-amber-500"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Interactive SIH Judging Tour</span>
          </button>

          {/* Persona Switcher Dropdown */}
          <div className="relative flex items-center bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
            <UserCheck className="w-4 h-4 text-[#0f3c6e] mr-2 flex-shrink-0" />
            <div className="flex flex-col text-left mr-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Simulated Role</span>
              <select
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
          <div className="relative p-2 text-slate-600 hover:text-slate-900 cursor-pointer">
            <Bell className="w-4 h-4" />
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
