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
import { apiClient } from './services/apiClient';

export function App() {
  // Persistent LocalStorage / Fallback State
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

  // UI Navigation & Backend Connectivity State
  const [currentRole, setCurrentRole] = useState<Role>('REGIONAL_OFFICER');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedDocket, setSelectedDocket] = useState<string | null>('AICTE/2026-27/RO-N/10942');
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [backendNotice, setBackendNotice] = useState<string | null>(null);

  // Load Authoritative State from Relational Backend
  const refreshAllFromBackend = async (role = currentRole) => {
    try {
      const [apps, evc, und, docs, notifs, audit] = await Promise.all([
        apiClient.getApplications(role),
        apiClient.getEVCRecords(role),
        apiClient.getUndertakings(role),
        apiClient.getDocuments(role),
        apiClient.getNotifications(role),
        apiClient.getAuditLogs(role),
      ]);
      setApplications(apps);
      setEvcRecords(evc);
      setUndertakings(und);
      setDocuments(docs);
      setNotifications(notifs);
      setAuditLogs(audit);
      setBackendConnected(true);
    } catch (err: any) {
      console.warn('Backend fetch failed or offline, using cached state:', err);
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    refreshAllFromBackend(currentRole);
  }, [currentRole]);

  // Sync to localStorage as client cache
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

  // Workflow Handlers
  const handleAdvanceStage = async (appId: string, targetStage: WorkflowStage, reason: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return { success: false, message: 'Application not found.' };

    try {
      const result = await apiClient.transitionApplication(
        appId,
        targetStage,
        reason,
        'APH-2024-27-REV-02',
        currentRole
      );
      await refreshAllFromBackend(currentRole);
      setBackendNotice(`Docket transition committed to SQLite & SHA-256 block #${result.transition.auditBlockHeight} generated.`);
      setTimeout(() => setBackendNotice(null), 5000);
      return { success: true, message: result.message };
    } catch (err: any) {
      // Return authoritative backend validation error
      return { success: false, message: err.message };
    }
  };

  const handleResolveDeficiency = async (appId: string, defId: string) => {
    try {
      await apiClient.resolveDeficiency(appId, defId, 'Rectified by applicant with documentation', currentRole);
      await refreshAllFromBackend(currentRole);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDeficiency = async (appId: string, clause: string, description: string) => {
    try {
      await apiClient.addDeficiency(appId, clause, description, 'CRITICAL', currentRole);
      await refreshAllFromBackend(currentRole);
    } catch (err) {
      console.error(err);
    }
  };

  // EVC Handlers
  const handleScheduleVisit = async (evcId: string, visitDate: string) => {
    try {
      await apiClient.scheduleEVC(evcId, visitDate, 'EVC Desk Coordinator', currentRole);
      await refreshAllFromBackend(currentRole);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitEVCOutcome = async (
    evcId: string,
    recommendation: 'RECOMMENDED_FULL' | 'RECOMMENDED_WITH_CONDITIONS' | 'REJECTED_DEFICIENT',
    remarks: string
  ) => {
    try {
      const rec = recommendation === 'RECOMMENDED_FULL' ? 'RECOMMEND_APPROVAL' : 'DEFICIENCY_POINTED';
      await apiClient.submitEVCOutcome(evcId, rec, remarks, undefined, currentRole);
      await refreshAllFromBackend(currentRole);
    } catch (err) {
      console.error(err);
    }
  };

  // Undertakings Handlers
  const handleUploadEvidence = async (undId: string, fileName: string) => {
    try {
      await apiClient.uploadUndertakingEvidence(undId, fileName, '3.9 MB', currentRole);
      await refreshAllFromBackend(currentRole);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyUndertaking = async (undId: string, verified: boolean, notes: string) => {
    try {
      await apiClient.verifyUndertaking(undId, verified ? 'APPROVE' : 'RETURN', notes, currentRole);
      await refreshAllFromBackend(currentRole);
    } catch (err) {
      console.error(err);
    }
  };

  // Document Radar Handlers
  const handleConfirmOCR = async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    try {
      await apiClient.confirmDocumentOCR(docId, doc.issueDate, doc.expiryDate, 'Human verified', currentRole);
      await refreshAllFromBackend(currentRole);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitRenewal = async (docId: string, newExpiry: string, newNumber: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    try {
      await apiClient.renewDocument(docId, newExpiry, newNumber, doc.issuedByAuthority, currentRole);
      await refreshAllFromBackend(currentRole);
    } catch (err) {
      console.error(err);
    }
  };

  // Cron Reconciler: Rechecks open obligations with backend reconciliation
  const handleTriggerCronCheck = async () => {
    try {
      const res = await apiClient.reconcileNotifications(currentRole);
      await refreshAllFromBackend(currentRole);
      setBackendNotice(`Durable background worker reconciled obligations: ${res.newAlertsCreated} alerts escalated, ${res.alertsSuppressed} resolved alerts suppressed.`);
      setTimeout(() => setBackendNotice(null), 5000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAcknowledgeAlert = async (notifId: string) => {
    try {
      await apiClient.acknowledgeNotification(notifId, currentRole);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, status: 'ACKNOWLEDGED' } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetSeedData = async () => {
    try {
      await apiClient.resetDemo();
      localStorage.removeItem('aicte_oneflow_apps_v3');
      localStorage.removeItem('aicte_oneflow_evc_v3');
      localStorage.removeItem('aicte_oneflow_und_v3');
      localStorage.removeItem('aicte_oneflow_docs_v3');
      localStorage.removeItem('aicte_oneflow_notifs_v3');
      localStorage.removeItem('aicte_oneflow_audit_v3');
      await refreshAllFromBackend(currentRole);
      setSelectedDocket('AICTE/2026-27/RO-N/10942');
      setBackendNotice('Demonstration dataset safely reset to pristine baseline in SQLite database.');
      setTimeout(() => setBackendNotice(null), 5000);
    } catch (err: any) {
      console.error('Demo reset failed:', err);
    }
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
        backendConnected={backendConnected}
      />

      {/* Authoritative Relational Backend Live Toast */}
      {backendNotice && (
        <div className="bg-[#0a2540] text-white px-4 py-2.5 text-xs font-mono flex items-center justify-between border-b border-emerald-500 shadow-sm">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-emerald-300">SQLITE RELATIONAL COMMIT:</span>
            <span>{backendNotice}</span>
          </div>
          <button
            onClick={() => setBackendNotice(null)}
            className="text-slate-400 hover:text-white px-2"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

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
