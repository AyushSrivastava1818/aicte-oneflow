import React, { useState } from 'react';
import { 
  Play, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  FileCheck2, 
  Users, 
  CalendarClock, 
  FileLock2, 
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';
import { TabType } from './Navigation';
import { Role } from '../types';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: TabType) => void;
  onSelectDocket: (docket: string) => void;
  onSwitchRole: (role: Role) => void;
}

const SCENES = [
  {
    sceneNumber: 1,
    title: 'Scene 1: Docket Intake & Deterministic APH Routing',
    tab: 'workflow' as TabType,
    docket: 'AICTE/2026-27/RO-N/10942',
    role: 'SCRUTINY_OFFICER' as Role,
    summary: 'Institution submits an application. AICTE OneFlow assigns reference number, binds rule version (APH-2026-27), and deterministically computes the Next Best Administrative Action (NBAA).',
    demonstrationTip: 'Explain to the jury that the application route (New Institution vs. EoA) is governed by rule configurations, not ad-hoc frontend flags.',
    actionLabel: 'Inspect Docket in Workflow Engine',
  },
  {
    sceneNumber: 2,
    title: 'Scene 2: Scrutiny Observations & Prerequisite Enforcement',
    tab: 'workflow' as TabType,
    docket: 'AICTE/2026-27/RO-N/10942',
    role: 'SCRUTINY_OFFICER' as Role,
    summary: 'Bureau Scrutiny Desk evaluates Form 15 checklist. When Fire NOC is deficient, Form 17 Deficiency Note is raised. Show judges how the system BLOCKS advancing to EVC until prerequisites are met.',
    demonstrationTip: 'Try clicking "Begin Scrutiny" or examine the active deficiencies checklist to demonstrate how invalid transitions are blocked with precise regulatory clauses.',
    actionLabel: 'View Scrutiny Deficiencies & Prerequisites',
  },
  {
    sceneNumber: 3,
    title: 'Scene 3: EVC Committee Dispatch & Peer Conflict Check',
    tab: 'evc' as TabType,
    docket: 'AICTE/2026-27/RO-SW/11029',
    role: 'EVC_COORDINATOR' as Role,
    summary: 'Scrutiny-cleared cases enter the EVC queue. OneFlow automatically verifies pre-inspection readiness and confirms zero conflict of interest (peers from other states) before confirming schedule.',
    demonstrationTip: 'Highlight the Readiness Checklist (Biometric faculty roster, land geo-tagging, building completion) before scheduling an inspection date.',
    actionLabel: 'Open EVC Scheduling Console',
  },
  {
    sceneNumber: 4,
    title: 'Scene 4: Time-Bound Undertaking & Post-Approval Evidence',
    tab: 'undertakings' as TabType,
    docket: 'AICTE/2026-27/RO-W/08831',
    role: 'REGIONAL_OFFICER' as Role,
    summary: 'Extension of Approval was granted subject to a registered lease renewal within 30 days. Institution uploaded evidence. OneFlow enforces that "Submission ≠ Compliance" until officer verification.',
    demonstrationTip: 'Show how the Regional Officer examines the uploaded lease PDF and verifies or returns it for correction with timestamped notes.',
    actionLabel: 'Inspect Compliance Undertakings',
  },
  {
    sceneNumber: 5,
    title: 'Scene 5: 30-Year Lease Expiry Radar & OCR Inspector',
    tab: 'documents' as TabType,
    docket: 'AICTE/2026-27/RO-W/08831',
    role: 'REGIONAL_OFFICER' as Role,
    summary: 'Surveillance radar monitors document validity over 7, 30, 60, and 90-day horizons. Simulated OCR extracts candidate dates, but enforces human-in-the-loop sign-off to prevent OCR hallucinations.',
    demonstrationTip: 'Toggle the 7-day radar view and demonstrate the Assisted Document Intelligence panel with human-in-the-loop validation.',
    actionLabel: 'Open Document Expiry Radar',
  },
  {
    sceneNumber: 6,
    title: 'Scene 6: Tamper-Evident SHA-256 Audit Ledger & Vigilance Review',
    tab: 'audit' as TabType,
    docket: 'AICTE/2026-27/RO-N/10942',
    role: 'STATUTORY_AUDITOR' as Role,
    summary: 'Central Vigilance and CAG statutory auditors verify the cryptographic hash chain. Click "Verify Cryptographic Integrity" or simulate database tampering to prove how unauthorized changes are caught.',
    demonstrationTip: 'Click the "Simulate Malicious Tamper" button and run the hash check to show how the system detects the exact corrupted block!',
    actionLabel: 'Inspect Cryptographic Audit Chain',
  },
];

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectDocket,
  onSwitchRole,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const scene = SCENES[currentStep];

  const handleExecuteScene = () => {
    onNavigateTab(scene.tab);
    onSelectDocket(scene.docket);
    onSwitchRole(scene.role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0a2540] text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm">
              SIH
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                Interactive SIH 2026 Judging Walkthrough
              </h3>
              <p className="text-[11px] text-slate-300">
                AICTE Approval Workflow Automation & Institutional Compliance (SIH26262)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scene Navigation Bar */}
        <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200 text-xs">
          <span className="font-semibold text-slate-700">
            Scenario Step {scene.sceneNumber} of {SCENES.length}
          </span>
          <div className="flex items-center gap-1">
            {SCENES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-6 h-6 rounded text-[11px] font-bold transition-all ${
                  idx === currentStep
                    ? 'bg-[#0f3c6e] text-white'
                    : idx < currentStep
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-white text-slate-600 border border-slate-300'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Scene Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#0f3c6e] bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-200">
              {scene.tab.toUpperCase()} MODULE
            </span>
            <h4 className="text-base font-bold text-[#0a2540] mt-1.5">
              {scene.title}
            </h4>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              System Scenario Flow:
            </span>
            <p className="text-slate-700 text-xs leading-relaxed">
              {scene.summary}
            </p>
          </div>

          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Judging Presentation Script Tip:</span>
            </div>
            <p className="text-amber-900 text-xs leading-relaxed">
              {scene.demonstrationTip}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
            <div>
              <span className="text-slate-400 block">Demonstration Docket:</span>
              <strong className="font-mono text-slate-800">{scene.docket}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Simulated Persona:</span>
              <strong className="text-slate-800">{scene.role}</strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-30 text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentStep === SCENES.length - 1}
              onClick={() => setCurrentStep(prev => Math.min(SCENES.length - 1, prev + 1))}
              className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-30 text-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExecuteScene}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0f3c6e] hover:bg-[#0a2540] text-white text-xs font-bold rounded shadow-sm transition-all"
          >
            <span>{scene.actionLabel}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
