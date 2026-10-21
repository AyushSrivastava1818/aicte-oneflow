import { Role, Application, EVCRecord, Undertaking, PrescribedDocument, NotificationLog, CryptographicAuditRecord } from '../types';

const API_BASE = '/api';

function getHeaders(role?: Role): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (role) {
    headers['x-simulated-role'] = role;
  }
  const token = localStorage.getItem('aicte_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const apiClient = {
  // Health
  async checkHealth(): Promise<{ status: string; database: string; applicationsCount: number }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('aicte_auth_token', data.token);
    }
    return data;
  },

  // Applications
  async getApplications(role?: Role): Promise<Application[]> {
    const res = await fetch(`${API_BASE}/applications`, {
      headers: getHeaders(role),
    });
    if (!res.ok) throw new Error('Failed to fetch applications from server');
    return res.json();
  },

  async getApplicationById(id: string, role?: Role): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      headers: getHeaders(role),
    });
    if (!res.ok) throw new Error(`Failed to fetch docket ${id}`);
    return res.json();
  },

  async transitionApplication(
    id: string,
    targetStage: string,
    observations: string,
    ruleVersion: string,
    role?: Role
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/applications/${id}/transition`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify({ targetStage, observations, ruleVersion }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.missingPrerequisites?.join('; ') || 'Transition failed');
    }
    return data;
  },

  async addDeficiency(
    id: string,
    clause: string,
    description: string,
    severity: string,
    role?: Role
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/applications/${id}/deficiencies`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify({ clause, description, severity }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add deficiency');
    }
    return res.json();
  },

  async resolveDeficiency(
    appId: string,
    defId: string,
    resolutionNote: string,
    role?: Role
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/applications/${appId}/deficiencies/${defId}/resolve`, {
      method: 'PUT',
      headers: getHeaders(role),
      body: JSON.stringify({ resolutionNote }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to resolve deficiency');
    }
    return res.json();
  },

  // EVC Records
  async getEVCRecords(role?: Role): Promise<EVCRecord[]> {
    const res = await fetch(`${API_BASE}/evc`, {
      headers: getHeaders(role),
    });
    if (!res.ok) throw new Error('Failed to fetch EVC records');
    return res.json();
  },

  async scheduleEVC(
    id: string,
    scheduledDate: string,
    coordinatorName: string,
    role?: Role
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/evc/${id}/schedule`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify({ scheduledDate, coordinatorName }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to schedule EVC');
    }
    return res.json();
  },

  async submitEVCOutcome(
    id: string,
    recommendation: string,
    remarks: string,
    readinessChecks: any,
    role?: Role
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/evc/${id}/outcome`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify({ recommendation, remarks, readinessChecks }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record EVC outcome');
    }
    return res.json();
  },

  // Undertakings
  async getUndertakings(role?: Role): Promise<Undertaking[]> {
    const res = await fetch(`${API_BASE}/undertakings`, {
      headers: getHeaders(role),
    });
    if (!res.ok) throw new Error('Failed to fetch undertakings');
    return res.json();
  },

  async uploadUndertakingEvidence(
    id: string,
    evidenceDocName: string,
    evidenceDocSize: string,
    role?: Role
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/undertakings/${id}/upload`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify({ evidenceDocName, evidenceDocSize }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload evidence');
    }
    return res.json();
  },

  async verifyUndertaking(
    id: string,
    action: 'APPROVE' | 'RETURN',
    verificationNotes: string,
    role?: Role
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/undertakings/${id}/verify`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify({ action, verificationNotes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to verify undertaking');
    }
    return res.json();
  },

  // Prescribed Documents
  async getDocuments(role?: Role): Promise<PrescribedDocument[]> {
    const res = await fetch(`${API_BASE}/documents`, {
      headers: getHeaders(role),
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async confirmDocumentOCR(
    id: string,
    confirmedIssueDate: string,
    confirmedExpiryDate: string,
    notes: string,
    role?: Role
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${id}/confirm-ocr`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify({ confirmedIssueDate, confirmedExpiryDate, notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to confirm OCR');
    }
    return res.json();
  },

  async renewDocument(
    id: string,
    newExpiryDate: string,
    newDocumentNumber: string,
    authority: string,
    role?: Role
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${id}/renew`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify({ newExpiryDate, newDocumentNumber, authority }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to renew document');
    }
    return res.json();
  },

  // Notifications
  async getNotifications(role?: Role): Promise<NotificationLog[]> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(role),
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async reconcileNotifications(role?: Role): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications/reconcile`, {
      method: 'POST',
      headers: getHeaders(role),
    });
    if (!res.ok) throw new Error('Failed to reconcile notifications');
    return res.json();
  },

  async acknowledgeNotification(id: string, role?: Role): Promise<any> {
    const res = await fetch(`${API_BASE}/notifications/${id}/acknowledge`, {
      method: 'PUT',
      headers: getHeaders(role),
    });
    if (!res.ok) throw new Error('Failed to acknowledge notification');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(role?: Role): Promise<CryptographicAuditRecord[]> {
    const res = await fetch(`${API_BASE}/audit`, {
      headers: getHeaders(role),
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async verifyAuditChain(role?: Role): Promise<{
    isValid: boolean;
    verifiedBlocks: number;
    rootHash: string;
    message: string;
    verificationTimestamp: string;
  }> {
    const res = await fetch(`${API_BASE}/audit/verify`, {
      headers: getHeaders(role),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.reason || 'Cryptographic audit verification failed');
    }
    return data;
  },

  // Admin Reset
  async resetDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/reset-demo`, {
      method: 'POST',
      headers: getHeaders('CENTRAL_ADMIN'),
      body: JSON.stringify({ confirmation: 'CONFIRM_RESET_DEMO_STATE' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset demo dataset');
    }
    return res.json();
  },
};
