import React, { useState, useEffect } from 'react';
import { 
  Application, 
  CryptographicAuditRecord, 
  EVCRecord, 
  NotificationLog, 
  PrescribedDocument, 
  Role, 
  Undertaking, 
  WorkflowStage 
} from './types';
import { 
  INITIAL_APPLICATIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_DOCUMENTS, 
  INITIAL_EVC_RECORDS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_UNDERTAKINGS 
} from './data/seedData';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { OverviewDashboard } from './components/OverviewDashboard';
import { WorkflowManager } from './components/WorkflowManager';
import { EVCScheduler } from './components/EVCScheduler';
import { UndertakingsTracker } from './components/UndertakingsTracker';
import { DocumentRadar } from './components/DocumentRadar';
import { NotificationEngine } from './components/NotificationEngine';
import { AuditLedger } from './components/AuditLedger';
import { WalkthroughModal } from './components/WalkthroughModal';
import { computeSha256, createCanonicalPayload } from './services/workflowEngine';

export function App() {
  // Persistent LocalStorage State
  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem('aicte_oneflow_apps_v3');
    return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
  });

  const [evcRecords, setEvcRecords] = useState<EVCRecord[]>(() => {
    const saved = localStorage.getItem('aicte_oneflow_evc_v3');
    return saved ? JSON.parse(saved) : INITIAL_EVC_RECORDS;
  });

  const [undertakings, setUndertakings] = useState<Undertaking[]>(() => {
    const saved = localStorage.getItem('aicte_oneflow_und_v3');
    return saved ? JSON.parse(saved) : INITIAL_UNDERTAKINGS;
  });

  const [documents, setDocuments] = useState<PrescribedDocument[]>(() => {
    const saved = localStorage.getItem('aicte_oneflow_docs_v3');
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });

  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    const saved = localStorage.getItem('aicte_oneflow_notifs_v3');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<CryptographicAuditRecord[]>(() => {
    const saved = localStorage.getItem('aicte_oneflow_audit_v3');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // UI Navigation State
  const [currentRole, setCurrentRole] = useState<Role>('REGIONAL_OFFICER');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedDocket, setSelectedDocket] = useState<string | null>('AICTE/2026-27/RO-N/10942');
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('aicte_oneflow_apps_v3', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem('aicte_oneflow_evc_v3', JSON.stringify(evcRecords));
  }, [evcRecords]);

  useEffect(() => {
    localStorage.setItem('aicte_oneflow_und_v3', JSON.stringify(undertakings));
  }, [undertakings]);

  useEffect(() => {
    localStorage.setItem('aicte_oneflow_docs_v3', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('aicte_oneflow_notifs_v3', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('aicte_oneflow_audit_v3', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Helper to append an immutable cryptographic audit record with canonical JSON serialization
  const appendAuditRecord = async (
    actorRole: Role,
    actorName: string,
    actionType: string,
    docketNumber: string,
    prevStage: string,
    newStage: string,
    reason: string
  ) => {
    const lastBlock = auditLogs[auditLogs.length - 1];
    const prevHash = lastBlock ? lastBlock.currentHash : 'GENESIS_BLOCK_AICTE_ONEFLOW_00000000000000000000000000000000';
    const blockHeight = auditLogs.length + 1;
    const timestamp = new Date().toISOString();
    const actorId = `usr-${actorRole.toLowerCase()}-${Date.now().toString().slice(-4)}`;

    const canonicalPayload = createCanonicalPayload({
      actionType,
      actorId,
      blockHeight,
      docketNumber,
      newStage,
      previousHash: prevHash,
      previousStage: prevStage,
      reasonOrObservations: reason,
      ruleVersion: 'APH-2024-27-v1.4',
      timestamp,
    });

    const currentHash = await computeSha256(canonicalPayload);

    const newBlock: CryptographicAuditRecord = {
      id: `audit-block-${blockHeight}`,
      blockHeight,
      timestamp,
      actorId,
      actorName,
      actorRole,
      actionType,
      docketNumber,
      previousStage: prevStage,
      newStage,
      ruleVersion: 'APH-2024-27-v1.4',
      reasonOrObservations: reason,
      ipAddress: '10.14.88.24 (AICTE Regulated Bureau Node)',
      canonicalPayload,
      algorithm: 'SHA-256',
      schemaVersion: '1.2',
      previousHash: prevHash,
      currentHash,
    };

    setAuditLogs(prev => [...prev, newBlock]);
  };

  // Workflow Handlers
  const handleAdvanceStage = async (appId: string, targetStage: WorkflowStage, reason: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return { success: false, message: 'Application not found.' };

    const oldStage = app.currentStage;

    setApplications(prev => prev.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          currentStage: targetStage,
          lastAction: reason,
          lastActionTimestamp: new Date().toISOString(),
        };
      }
      return a;
    }));

    await appendAuditRecord(
      currentRole,
      currentRole === 'CENTRAL_ADMIN' ? 'Member Secretary AICTE' :
      currentRole === 'REGIONAL_OFFICER' ? 'Regional Director RO' :
      currentRole === 'SCRUTINY_OFFICER' ? 'Bureau Scrutiny Desk 3' : 'Authorized Signatory',
      `STAGE_TRANSITION_TO_${targetStage}`,
      app.docketNumber,
      oldStage,
      targetStage,
      reason
    );

    return {
      success: true,
      message: `Docket ${app.docketNumber} successfully transitioned from ${oldStage} to ${targetStage}. Cryptographic block committed.`,
    };
  };

  const handleResolveDeficiency = async (appId: string, defId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    setApplications(prev => prev.map(a => {
      if (a.id === appId) {
        const updatedDefs = a.deficiencies.map(d => d.id === defId ? { ...d, resolved: true } : d);
        return {
          ...a,
          deficiencies: updatedDefs,
          lastAction: 'Deficiency resolved following verification',
          lastActionTimestamp: new Date().toISOString(),
        };
      }
      return a;
    }));

    await appendAuditRecord(
      currentRole,
      'Bureau Scrutiny Desk',
      'DEFICIENCY_MARKED_RESOLVED',
      app.docketNumber,
      app.currentStage,
      app.currentStage,
      `Deficiency ID ${defId} certified rectified after re-scrutiny verification.`
    );
  };

  const handleAddDeficiency = async (appId: string, clause: string, description: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    const newDef = {
      id: `def-${Date.now().toString().slice(-4)}`,
      clause,
      description,
      severity: 'CRITICAL' as const,
      raisedBy: 'Bureau Scrutiny Officer',
      raisedAt: new Date().toISOString(),
      resolved: false,
    };

    setApplications(prev => prev.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          currentStage: 'SCRUTINY_DEFICIENCY_RAISED',
          deficiencies: [...a.deficiencies, newDef],
          lastAction: `Deficiency raised: ${clause}`,
          lastActionTimestamp: new Date().toISOString(),
        };
      }
      return a;
    }));

    await appendAuditRecord(
      currentRole,
      'Bureau Scrutiny Officer',
      'DEFICIENCY_RECORDED',
      app.docketNumber,
      app.currentStage,
      'SCRUTINY_DEFICIENCY_RAISED',
      `Form 17 Deficiency recorded under ${clause}: ${description}`
    );
  };

  // EVC Handlers
  const handleScheduleVisit = async (evcId: string, visitDate: string) => {
    const evc = evcRecords.find(e => e.id === evcId);
    if (!evc) return;

    setEvcRecords(prev => prev.map(e => e.id === evcId ? { ...e, scheduledDate: visitDate, status: 'SCHEDULED' } : e));
    setApplications(prev => prev.map(a => a.id === evc.applicationId ? { ...a, currentStage: 'EVC_SCHEDULED' } : a));

    await appendAuditRecord(
      currentRole,
      'EVC Coordinator',
      'EVC_VISIT_SCHEDULED',
      evc.docketNumber,
      'EVC_QUEUED',
      'EVC_SCHEDULED',
      `EVC visit scheduled for ${new Date(visitDate).toLocaleString()}. Conflict-of-interest check confirmed.`
    );
  };

  const handleSubmitEVCOutcome = async (
    evcId: string,
    recommendation: 'RECOMMENDED_FULL' | 'RECOMMENDED_WITH_CONDITIONS' | 'REJECTED_DEFICIENT',
    remarks: string
  ) => {
    const evc = evcRecords.find(e => e.id === evcId);
    if (!evc) return;

    setEvcRecords(prev => prev.map(e => e.id === evcId ? { ...e, status: 'REPORT_SUBMITTED', recommendation, remarks } : e));
    setApplications(prev => prev.map(a => a.id === evc.applicationId ? { ...a, currentStage: 'EVC_COMPLETED' } : a));

    await appendAuditRecord(
      currentRole,
      'EVC Panel Committee',
      'EVC_REPORT_SUBMITTED',
      evc.docketNumber,
      'EVC_SCHEDULED',
      'EVC_COMPLETED',
      `EVC Inspection completed. Recommendation: ${recommendation}. Observations: ${remarks}`
    );
  };

  // Undertakings Handlers
  const handleUploadEvidence = async (undId: string, fileName: string) => {
    const und = undertakings.find(u => u.id === undId);
    if (!und) return;

    setUndertakings(prev => prev.map(u => u.id === undId ? {
      ...u,
      status: 'SUBMITTED_UNDER_REVIEW',
      evidenceDocName: fileName,
      evidenceDocSize: '3.9 MB',
      submittedAt: new Date().toISOString(),
    } : u));

    await appendAuditRecord(
      currentRole,
      'Institutional Registrar',
      'UNDERTAKING_EVIDENCE_SUBMITTED',
      und.docketNumber,
      'PENDING_SUBMISSION',
      'SUBMITTED_UNDER_REVIEW',
      `Evidence uploaded for undertaking ${und.title} (File: ${fileName}). Submission queued for Bureau verification.`
    );
  };

  const handleVerifyUndertaking = async (undId: string, verified: boolean, notes: string) => {
    const und = undertakings.find(u => u.id === undId);
    if (!und) return;

    const newStatus = verified ? 'VERIFIED_COMPLIANT' : 'RETURNED_FOR_CORRECTION';

    setUndertakings(prev => prev.map(u => u.id === undId ? {
      ...u,
      status: newStatus,
      verificationNotes: notes,
      verifiedBy: 'Regional Officer',
      verifiedAt: new Date().toISOString(),
    } : u));

    await appendAuditRecord(
      currentRole,
      'Regional Officer',
      verified ? 'UNDERTAKING_VERIFIED_COMPLIANT' : 'UNDERTAKING_RETURNED_FOR_CORRECTION',
      und.docketNumber,
      und.status,
      newStatus,
      `Undertaking ${und.title} verification outcome: ${verified ? 'ACCEPTED COMPLIANT' : 'RETURNED'}. Notes: ${notes}`
    );
  };

  // Document Radar Handlers
  const handleConfirmOCR = async (docId: string) => {
    setDocuments(prev => prev.map(d => d.id === docId ? {
      ...d,
      ocrExtraction: { 
        ...d.ocrExtraction, 
        humanConfirmed: true,
        confirmedBy: currentRole,
        confirmedAt: new Date().toISOString(),
      }
    } : d));
  };

  const handleSubmitRenewal = async (docId: string, newExpiry: string, newNumber: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    setDocuments(prev => prev.map(d => d.id === docId ? {
      ...d,
      documentNumber: newNumber,
      expiryDate: newExpiry,
      daysRemaining: 3650,
      status: 'RENEWAL_VERIFIED',
      lastRenewedDate: new Date().toISOString(),
    } : d));

    await appendAuditRecord(
      currentRole,
      'Registrar & Regional Desk',
      'PRESCRIBED_DOCUMENT_RENEWAL_VERIFIED',
      doc.institutionCode,
      doc.status,
      'RENEWAL_VERIFIED',
      `Registered 30-Year Lease / Document renewal verified. New Expiry: ${newExpiry}, Reg No: ${newNumber}.`
    );
  };

  // Cron Simulator: Rechecks open obligations before dispatching notifications
  const handleTriggerCronCheck = () => {
    // Check if app-101 has open obligations
    const app101 = applications.find(a => a.id === 'app-101');
    const hasOpenObligations = app101 ? app101.deficiencies.some(d => !d.resolved) : true;

    const newNotif: NotificationLog = {
      id: `notif-${Date.now().toString().slice(-4)}`,
      docketNumber: 'AICTE/2026-27/RO-N/10942',
      recipientRole: 'SCRUTINY_OFFICER',
      recipientEmail: 'rameshwar.nath@aicte-india.org',
      subject: hasOpenObligations 
        ? 'Background Worker Heartbeat: SLA Reconciliation Complete'
        : 'Alert Suppressed: All obligations for docket are already verified resolved.',
      bodyPreview: hasOpenObligations
        ? 'Durable reconciler verified active dockets. Docket 10942 has 2 active deficiencies requiring resolution.'
        : 'Pre-dispatch check confirmed all deficiencies resolved. Duplicate alert suppressed.',
      channel: 'OFFICIAL_PORTAL_ALERT',
      timestamp: new Date().toISOString(),
      status: hasOpenObligations ? 'DELIVERED_SIMULATED' : 'SUPPRESSED_RESOLVED',
      escalationLevel: 'DESK_OFFICER',
      idempotencyKey: `idemp_cron_reconcile_${Date.now()}`,
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
      obligationStillOpen: hasOpenObligations,
    };

    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAcknowledgeAlert = (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, status: 'ACKNOWLEDGED' } : n));
  };

  const handleResetSeedData = () => {
    localStorage.removeItem('aicte_oneflow_apps_v3');
    localStorage.removeItem('aicte_oneflow_evc_v3');
    localStorage.removeItem('aicte_oneflow_und_v3');
    localStorage.removeItem('aicte_oneflow_docs_v3');
    localStorage.removeItem('aicte_oneflow_notifs_v3');
    localStorage.removeItem('aicte_oneflow_audit_v3');
    setApplications(INITIAL_APPLICATIONS);
    setEvcRecords(INITIAL_EVC_RECORDS);
    setUndertakings(INITIAL_UNDERTAKINGS);
    setDocuments(INITIAL_DOCUMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSelectedDocket('AICTE/2026-27/RO-N/10942');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Official Government Header Banner */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
        unreadAlertCount={notifications.filter(n => n.status === 'DELIVERED_SIMULATED').length}
        onResetSeedData={handleResetSeedData}
      />

      {/* Primary Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          pendingWorkflow: applications.filter(a => a.currentStage !== 'APPROVED_UNCONDITIONAL' && a.currentStage !== 'REJECTED').length,
          evcQueued: evcRecords.filter(e => e.status === 'PENDING_SCHEDULE').length,
          overdueUndertakings: undertakings.filter(u => u.status === 'OVERDUE_ESCALATED').length,
          expiringDocs: documents.filter(d => d.status === 'EXPIRING_SOON' || d.status === 'CRITICALLY_EXPIRED').length,
          escalatedAlerts: notifications.filter(n => n.status === 'ESCALATED').length,
        }}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6" role="main">
        {activeTab === 'overview' && (
          <OverviewDashboard
            applications={applications}
            undertakings={undertakings}
            documents={documents}
            onSelectDocket={(docket) => {
              setSelectedDocket(docket);
              setActiveTab('workflow');
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'workflow' && (
          <WorkflowManager
            applications={applications}
            selectedDocket={selectedDocket}
            onSelectDocket={setSelectedDocket}
            currentRole={currentRole}
            onAdvanceStage={handleAdvanceStage}
            onResolveDeficiency={handleResolveDeficiency}
            onAddDeficiency={handleAddDeficiency}
          />
        )}

        {activeTab === 'evc' && (
          <EVCScheduler
            evcRecords={evcRecords}
            onScheduleVisit={handleScheduleVisit}
            onSubmitOutcome={handleSubmitEVCOutcome}
          />
        )}

        {activeTab === 'undertakings' && (
          <UndertakingsTracker
            undertakings={undertakings}
            onUploadEvidence={handleUploadEvidence}
            onVerifyUndertaking={handleVerifyUndertaking}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentRadar
            documents={documents}
            onConfirmOCR={handleConfirmOCR}
            onSubmitRenewal={handleSubmitRenewal}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationEngine
            notifications={notifications}
            onTriggerCronCheck={handleTriggerCronCheck}
            onAcknowledgeAlert={handleAcknowledgeAlert}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLedger
            auditLogs={auditLogs}
          />
        )}
      </main>

      {/* Interactive SIH Judging Tour Modal */}
      <WalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        onNavigateTab={setActiveTab}
        onSelectDocket={setSelectedDocket}
        onSwitchRole={setCurrentRole}
      />

      {/* Official Gov Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-4 px-4 sm:px-6" role="contentinfo">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-200">
              AICTE OneFlow: Smart Approval Orchestration & Institutional Compliance Monitoring System
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Developed for Smart India Hackathon 2026 (Problem Statement SIH26262: Software / Smart Automation / AICTE).
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-400">
              Regulatory Baseline: <strong className="text-slate-200">AICTE Approval Process Handbook (APH 2024–2027)</strong>
            </span>
            <span className="text-slate-600" aria-hidden="true">|</span>
            <span className="text-emerald-400 font-mono">
              NIST FIPS 180-4 SHA-256 Ledger
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
