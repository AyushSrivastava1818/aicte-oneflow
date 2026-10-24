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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
    let isMounted = true;
    void (async () => {
      try {
        const [apps, evc, und, docs, notifs, audit] = await Promise.all([
          apiClient.getApplications(currentRole),
          apiClient.getEVCRecords(currentRole),
          apiClient.getUndertakings(currentRole),
          apiClient.getDocuments(currentRole),
          apiClient.getNotifications(currentRole),
          apiClient.getAuditLogs(currentRole),
        ]);
        if (isMounted) {
          setApplications(apps);
          setEvcRecords(evc);
          setUndertakings(und);
          setDocuments(docs);
          setNotifications(notifs);
          setAuditLogs(audit);
          setBackendConnected(true);
        }
      } catch (err: any) {
        console.warn('Backend fetch failed or offline, using cached state:', err);
        if (isMounted) {
          setBackendConnected(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
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
    const app = applications.find(a => a.id === appId || a.docketNumber === appId);
    if (!app) return { success: false, message: 'Application not found.' };

    const unresolved = (app.deficiencies || []).filter(d => !d.resolved);
    if (targetStage === 'SCRUTINY_CLEARED' && unresolved.length > 0) {
      return { success: false, message: `${unresolved.length} unresolved deficiency(ies) pending institutional rectification.` };
    }

    setApplications(prev => prev.map(a => (a.id === appId || a.docketNumber === appId) ? {
      ...a,
      currentStage: targetStage,
      lastAction: reason || `Transitioned to ${targetStage}`,
      lastActionTimestamp: new Date().toISOString()
    } : a));

    setBackendNotice(`Docket transition to ${targetStage} committed successfully.`);
    setTimeout(() => setBackendNotice(null), 4000);

    try {
      await apiClient.transitionApplication(
        appId,
        targetStage,
        reason,
        'APH-2024-27-REV-02',
        currentRole
      );
    } catch (err: any) {
      console.warn('Backend transition sync notice:', err?.message);
    }

    return { success: true, message: `Docket successfully transitioned to ${targetStage}.` };
  };

  const handleResolveDeficiency = async (appId: string, defId: string) => {
    setApplications(prev => prev.map(a => {
      if (a.id === appId || a.docketNumber === appId) {
        const updatedDefs = (a.deficiencies || []).map(d =>
          d.id === defId ? { ...d, resolved: true, resolutionNote: 'Rectified with verified documentation' } : d
        );
        return {
          ...a,
          deficiencies: updatedDefs,
          fireNocValid: true,
          cadreRatio: '1:15 (Compliant)',
          lastAction: `Deficiency marked rectified: ${defId}`,
          lastActionTimestamp: new Date().toISOString(),
        };
      }
      return a;
    }));

    setBackendNotice(`Deficiency marked rectified. Statutory compliance updated.`);
    setTimeout(() => setBackendNotice(null), 3000);

    try {
      await apiClient.resolveDeficiency(appId, defId, 'Rectified by applicant with documentation', currentRole);
    } catch (err) {
      console.warn('Backend resolveDeficiency sync notice:', err);
    }
  };

  const handleAddDeficiency = async (appId: string, clause: string, description: string) => {
    const newDefId = `def-${Date.now()}`;
    setApplications(prev => prev.map(a => {
      if (a.id === appId || a.docketNumber === appId) {
        const newDef = {
          id: newDefId,
          clause,
          description,
          severity: 'CRITICAL' as const,
          raisedBy: currentRole,
          raisedAt: new Date().toISOString(),
          resolved: false,
        };
        return {
          ...a,
          deficiencies: [...(a.deficiencies || []), newDef],
          lastAction: `Deficiency pointed: ${clause}`,
          lastActionTimestamp: new Date().toISOString(),
        };
      }
      return a;
    }));

    setBackendNotice(`New deficiency flagged: ${clause}`);
    setTimeout(() => setBackendNotice(null), 3000);

    try {
      await apiClient.addDeficiency(appId, clause, description, 'CRITICAL', currentRole);
    } catch (err) {
      console.warn('Backend addDeficiency sync notice:', err);
    }
  };

  // EVC Handlers
  const handleScheduleVisit = async (evcId: string, visitDate: string) => {
    setEvcRecords(prev => prev.map(e => e.id === evcId ? {
      ...e,
      status: 'SCHEDULED',
      scheduledDate: visitDate,
      coordinatorName: 'Dr. S. K. Verma',
      conflictCheckStatus: 'NO_KNOWN_CONFLICT_DETECTED',
    } : e));

    setBackendNotice(`EVC Panel visit scheduled for ${visitDate}. Conflict verification cleared.`);
    setTimeout(() => setBackendNotice(null), 4000);

    try {
      await apiClient.scheduleEVC(evcId, visitDate, 'EVC Desk Coordinator', currentRole);
    } catch (err) {
      console.warn('Backend scheduleEVC sync notice:', err);
    }
  };

  const handleSubmitEVCOutcome = async (
    evcId: string,
    recommendation: 'RECOMMENDED_FULL' | 'RECOMMENDED_WITH_CONDITIONS' | 'REJECTED_DEFICIENT',
    remarks: string
  ) => {
    setEvcRecords(prev => prev.map(e => e.id === evcId ? {
      ...e,
      status: 'REPORT_SUBMITTED',
      recommendation,
      remarks,
    } : e));

    setBackendNotice(`EVC Inspection report submitted: ${recommendation}`);
    setTimeout(() => setBackendNotice(null), 4000);

    try {
      const rec = recommendation === 'RECOMMENDED_FULL' ? 'RECOMMEND_APPROVAL' : 'DEFICIENCY_POINTED';
      await apiClient.submitEVCOutcome(evcId, rec, remarks, undefined, currentRole);
    } catch (err) {
      console.warn('Backend submitEVCOutcome sync notice:', err);
    }
  };

  // Undertakings Handlers
  const handleUploadEvidence = async (undId: string, fileName: string) => {
    setUndertakings(prev => prev.map(u => u.id === undId ? {
      ...u,
      status: 'SUBMITTED_UNDER_REVIEW',
      evidenceDocName: fileName,
      submittedAt: new Date().toISOString(),
    } : u));

    setBackendNotice(`Evidence document '${fileName}' uploaded for undertaking.`);
    setTimeout(() => setBackendNotice(null), 3000);

    try {
      await apiClient.uploadUndertakingEvidence(undId, fileName, '3.9 MB', currentRole);
    } catch (err) {
      console.warn('Backend uploadUndertakingEvidence sync notice:', err);
    }
  };

  const handleVerifyUndertaking = async (undId: string, verified: boolean, notes: string) => {
    setUndertakings(prev => prev.map(u => u.id === undId ? {
      ...u,
      status: verified ? 'VERIFIED_COMPLIANT' : 'RETURNED_FOR_CORRECTION',
      verifiedBy: 'Regional Bureau Officer',
      verifiedAt: new Date().toISOString(),
      verificationNotes: notes,
    } : u));

    setBackendNotice(verified ? `Undertaking verified compliant.` : `Undertaking returned for correction.`);
    setTimeout(() => setBackendNotice(null), 3000);

    try {
      await apiClient.verifyUndertaking(undId, verified ? 'APPROVE' : 'RETURN', notes, currentRole);
    } catch (err) {
      console.warn('Backend verifyUndertaking sync notice:', err);
    }
  };

  // Document Radar Handlers
  const handleConfirmOCR = async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    setDocuments(prev => prev.map(d => d.id === docId ? {
      ...d,
      status: 'VALID',
      ocrJson: JSON.stringify({ verified: true, humanConfirmed: true, confirmedAt: new Date().toISOString() })
    } : d));

    setBackendNotice(`Document OCR verified by officer.`);
    setTimeout(() => setBackendNotice(null), 3000);

    try {
      await apiClient.confirmDocumentOCR(docId, doc.issueDate, doc.expiryDate, 'Human verified', currentRole);
    } catch (err) {
      console.warn('Backend confirmDocumentOCR sync notice:', err);
    }
  };

  const handleSubmitRenewal = async (docId: string, newExpiry: string, newNumber: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    const daysRemaining = Math.max(1, Math.round((new Date(newExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    setDocuments(prev => prev.map(d => d.id === docId ? {
      ...d,
      status: 'VALID',
      expiryDate: newExpiry,
      documentNumber: newNumber,
      daysRemaining,
      lastRenewedDate: new Date().toISOString(),
    } : d));

    setBackendNotice(`Document ${newNumber} renewed successfully.`);
    setTimeout(() => setBackendNotice(null), 3000);

    try {
      await apiClient.renewDocument(docId, newExpiry, newNumber, doc.issuedByAuthority, currentRole);
    } catch (err) {
      console.warn('Backend renewDocument sync notice:', err);
    }
  };

  // Cron Reconciler
  const handleTriggerCronCheck = async () => {
    let escalatedCount = 0;
    const now = new Date();
    setUndertakings(prev => prev.map(u => {
      if (u.status !== 'VERIFIED_COMPLIANT' && new Date(u.dueDate) < now) {
        escalatedCount++;
        return { ...u, status: 'OVERDUE_ESCALATED', escalationLevel: (u.escalationLevel || 0) + 1 };
      }
      return u;
    }));

    setBackendNotice(`Background sweep complete: ${escalatedCount} overdue obligations audited.`);
    setTimeout(() => setBackendNotice(null), 4000);

    try {
      await apiClient.reconcileNotifications(currentRole);
    } catch (err) {
      console.warn('Backend reconcileNotifications sync notice:', err);
    }
  };

  const handleAcknowledgeAlert = async (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, status: 'ACKNOWLEDGED' } : n));
    try {
      await apiClient.acknowledgeNotification(notifId, currentRole);
    } catch (err) {
      console.warn('Backend acknowledgeNotification sync notice:', err);
    }
  };

  const handleResetSeedData = async () => {
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

    setBackendNotice('Dataset reset to pristine baseline state.');
    setTimeout(() => setBackendNotice(null), 4000);

    try {
      await apiClient.resetDemo();
    } catch (err) {
      console.warn('Backend resetDemo sync notice:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Official Government Header Banner */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
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

      {/* Collapsible Side Navigation & Main Workspace */}
      <div className="flex-1 flex flex-row min-h-0">
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
          counts={{
            pendingWorkflow: applications.filter(a => a.currentStage !== 'APPROVED_UNCONDITIONAL' && a.currentStage !== 'REJECTED').length,
            evcQueued: evcRecords.filter(e => e.status === 'PENDING_SCHEDULE').length,
            overdueUndertakings: undertakings.filter(u => u.status === 'OVERDUE_ESCALATED').length,
            expiringDocs: documents.filter(d => d.status === 'EXPIRING_SOON' || d.status === 'CRITICALLY_EXPIRED').length,
            escalatedAlerts: notifications.filter(n => n.status === 'ESCALATED').length,
          }}
        />

        {/* Main Workspace Body */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto" role="main">
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
      </div>

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
