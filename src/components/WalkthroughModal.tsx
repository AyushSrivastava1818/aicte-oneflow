import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
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
    title: 'Scene 1: Docket Intake & Explainable Action Ledger',
    tab: 'workflow' as TabType,
    docket: 'AICTE/2026-27/RO-N/10942',
    role: 'SCRUTINY_OFFICER' as Role,
    summary: 'Institution submits an application. AICTE OneFlow assigns reference number, binds rule version (APH 2024–27 baseline), and deterministically computes the Explainable Case Action with SLA countdown and statutory rationale.',
    demonstrationTip: 'Explain to the jury that the application route (New Institution vs. EoA) is governed by rule configurations and explicitly displayed with provenance status.',
    actionLabel: 'Inspect Docket in Workflow Engine',
  },
  {
    sceneNumber: 2,
    title: 'Scene 2: Scrutiny Observations & Prerequisite Enforcement',
    tab: 'workflow' as TabType,
    docket: 'AICTE/2026-27/RO-N/10942',
    role: 'SCRUTINY_OFFICER' as Role,
    summary: 'Bureau Scrutiny Desk evaluates Form 15 checklist. When Fire NOC is deficient, Form 17 Deficiency Note is raised. The system strictly BLOCKS advancing to EVC until prerequisites are certified.',
    demonstrationTip: 'Demonstrate clicking "Certify Scrutiny Cleared" to show how the system blocks invalid transitions with specific regulatory blocker details.',
    actionLabel: 'View Scrutiny Deficiencies & Prerequisites',
  },
  {
    sceneNumber: 3,
    title: 'Scene 3: EVC Committee Dispatch & Objective Conflict Review',
    tab: 'evc' as TabType,
    docket: 'AICTE/2026-27/RO-SW/11029',
    role: 'EVC_COORDINATOR' as Role,
    summary: 'Scrutiny-cleared cases enter the EVC queue. OneFlow automatically verifies pre-inspection readiness and returns qualified conflict status (evaluating parent states and declared trust affiliations) before confirming schedule.',
    demonstrationTip: 'Highlight the qualified conflict status (NO_KNOWN_CONFLICT_DETECTED with explicit review scope) and the 4-point readiness checklist.',
    actionLabel: 'Open EVC Scheduling Console',
  },
  {
    sceneNumber: 4,
    title: 'Scene 4: Time-Bound Undertaking & Submission ≠ Compliance',
    tab: 'undertakings' as TabType,
    docket: 'AICTE/2026-27/RO-W/08831',
    role: 'REGIONAL_OFFICER' as Role,
    summary: 'Extension of Approval was granted subject to a registered lease renewal within 30 days. Institution uploaded evidence. OneFlow enforces that "Submission ≠ Compliance" until officer verification.',
    demonstrationTip: 'Show how the Regional Officer examines the uploaded lease PDF and verifies or returns it for correction with timestamped notes.',
    actionLabel: 'Inspect Compliance Undertakings',
  },
  {
    sceneNumber: 5,
    title: 'Scene 5: Operational Expiry Radar & Human-Confirmed Metadata',
    tab: 'documents' as TabType,
    docket: 'AICTE/2026-27/RO-W/08831',
    role: 'REGIONAL_OFFICER' as Role,
    summary: 'Surveillance radar monitors document validity over operational horizons (7, 30, 60, and 90 days). OCR extracts candidate fields, but enforces human-in-the-loop sign-off to prevent errors.',
    demonstrationTip: 'Demonstrate the Assisted Document Intelligence panel with human-in-the-loop validation and officer confirmation tracking.',
    actionLabel: 'Open Document Expiry Radar',
  },
  {
    sceneNumber: 6,
    title: 'Scene 6: Hash-Chained Audit Ledger & Isolated Sandbox Tamper Test',
    tab: 'audit' as TabType,
    docket: 'AICTE/2026-27/RO-N/10942',
    role: 'STATUTORY_AUDITOR' as Role,
    summary: 'Central Vigilance and statutory auditors verify the cryptographic SHA-256 hash chain. Click "Verify Live Ledger Integrity" or test isolated sandbox tampering to prove real-time detection without altering live records.',
    demonstrationTip: 'Click the "Inject Sandbox Tamper" button and run the hash check to show how the system detects the exact corrupted block in a safe sandbox.',
    actionLabel: 'Inspect Hash-Chained Audit Log',
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scene = SCENES[currentStep];

  const handleExecuteScene = () => {
    onNavigateTab(scene.tab);
    onSelectDocket(scene.docket);
    onSwitchRole(scene.role);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0a2540] text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm" aria-hidden="true">
              SIH
            </div>
            <div>
              <h3 id="walkthrough-modal-title" className="text-sm font-bold tracking-wide">
                Interactive SIH 2026 Judging Walkthrough
              </h3>
              <p className="text-[11px] text-slate-300">
                AICTE Approval Workflow Automation & Institutional Compliance (SIH26262)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close walkthrough dialog"
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scene Navigation Bar */}
        <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200 text-xs">
          <span className="font-semibold text-slate-700">
            Scenario Step {scene.sceneNumber} of {SCENES.length}
          </span>
          <div className="flex items-center gap-1" role="tablist">
            {SCENES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to Scene ${idx + 1}`}
                aria-selected={idx === currentStep}
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
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
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
              aria-label="Previous scene"
              className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-30 text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              disabled={currentStep === SCENES.length - 1}
              onClick={() => setCurrentStep(prev => Math.min(SCENES.length - 1, prev + 1))}
              aria-label="Next scene"
              className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-30 text-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <button
            onClick={handleExecuteScene}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0f3c6e] hover:bg-[#0a2540] text-white text-xs font-bold rounded shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <span>{scene.actionLabel}</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
