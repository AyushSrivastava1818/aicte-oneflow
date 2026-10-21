import React, { useState } from 'react';
import { NotificationLog } from '../types';
import { 
  AlertTriangle, 
  Bell, 
  CheckCheck, 
  RefreshCw, 
  Mail, 
  Smartphone 
} from 'lucide-react';

interface NotificationEngineProps {
  notifications: NotificationLog[];
  onTriggerCronCheck: () => void;
  onAcknowledgeAlert: (notifId: string) => void;
}

export const NotificationEngine: React.FC<NotificationEngineProps> = ({
  notifications,
  onTriggerCronCheck,
  onAcknowledgeAlert,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  const filteredLogs = notifications.filter(n => {
    if (filterLevel === 'ALL') return true;
    return n.escalationLevel === filterLevel;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0a2540] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden="true" />
            <span>Escalation Matrix & Idempotent Alert Service (Simulated Adapters)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Durable SLA scheduling simulation with bounded retries, stable idempotency keys, and pre-dispatch obligation status checks.
          </p>
        </div>

        <button
          onClick={onTriggerCronCheck}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0f3c6e] hover:bg-[#0a2540] text-white text-xs font-semibold rounded shadow-xs transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Execute SLA Cron Reconciler</span>
        </button>
      </div>

      {/* Escalation Hierarchy Explanation Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 border-t border-r border-b border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[#0a2540] uppercase tracking-wider text-[11px]">Level 1: Desk Alert</span>
            <span className="bg-blue-100 text-blue-900 font-bold px-1.5 py-0.2 rounded text-[10px]">T-48h to SLA</span>
          </div>
          <p className="text-slate-600 mt-1">
            Dispatched to assigned Bureau Scrutiny Officer and Institutional Applicant for active clause resolution.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border-l-4 border-amber-500 border-t border-r border-b border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">Level 2: Regional Breach</span>
            <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded text-[10px]">Day 1 to 5 Breach</span>
          </div>
          <p className="text-slate-600 mt-1">
            Autonomous escalation to Regional Director (RO) with quasi-judicial hearing calendar integration.
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border-l-4 border-red-600 border-t border-r border-b border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-red-950 uppercase tracking-wider text-[11px]">Level 3: Statutory Default</span>
            <span className="bg-red-100 text-red-900 font-bold px-1.5 py-0.2 rounded text-[10px]">Day 6+ Breach</span>
          </div>
          <p className="text-slate-600 mt-1">
            High-priority dispatch to AICTE Member Secretary & Central Vigilance Directorate for penalty action.
          </p>
        </div>
      </div>

      {/* Notifications Ledger Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#0a2540]" aria-hidden="true" />
            <h3 className="text-xs font-bold text-[#0a2540] uppercase tracking-wider">
              Dispatched Alert Ledger ({filteredLogs.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="escalation-filter" className="text-slate-500 font-semibold">
              Filter:
            </label>
            <select
              id="escalation-filter"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="p-1 bg-white border border-slate-300 rounded text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Escalation Levels</option>
              <option value="DESK_OFFICER">Level 1: Desk Officer</option>
              <option value="REGIONAL_DIRECTOR">Level 2: Regional Director</option>
              <option value="MEMBER_SECRETARY">Level 3: Member Secretary</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs" aria-label="Notification Ledger">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th scope="col" className="py-2.5 px-4">Timestamp (IST)</th>
                <th scope="col" className="py-2.5 px-4">Target Role & Recipient</th>
                <th scope="col" className="py-2.5 px-4">Docket & Subject</th>
                <th scope="col" className="py-2.5 px-4">Channel</th>
                <th scope="col" className="py-2.5 px-4">Escalation Tier</th>
                <th scope="col" className="py-2.5 px-4">Idempotency Signature</th>
                <th scope="col" className="py-2.5 px-4 text-right">Acknowledgement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{log.recipientRole}</div>
                    <div className="text-[11px] text-slate-500">{log.recipientEmail}</div>
                  </td>

                  <td className="py-3 px-4 max-w-sm">
                    <span className="font-bold text-[#0f3c6e] block text-[11px] font-mono">
                      {log.docketNumber}
                    </span>
                    <div className="font-semibold text-slate-800">{log.subject}</div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{log.bodyPreview}</p>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {log.channel === 'NIC_EMAIL' && <Mail className="w-3 h-3 text-blue-600" aria-hidden="true" />}
                      {log.channel === 'GOV_SMS_GATEWAY' && <Smartphone className="w-3 h-3 text-emerald-600" aria-hidden="true" />}
                      {log.channel === 'OFFICIAL_PORTAL_ALERT' && <Bell className="w-3 h-3 text-amber-600" aria-hidden="true" />}
                      {log.channel}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      log.escalationLevel === 'MEMBER_SECRETARY' ? 'bg-red-100 text-red-900 border border-red-300' :
                      log.escalationLevel === 'REGIONAL_DIRECTOR' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      'bg-blue-100 text-blue-900'
                    }`}>
                      {log.escalationLevel.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                    {log.idempotencyKey}
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {log.status === 'ACKNOWLEDGED' ? (
                      <span className="text-emerald-700 font-bold flex items-center justify-end gap-1 text-[11px]">
                        <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" /> Acknowledged
                      </span>
                    ) : (
                      <button
                        onClick={() => onAcknowledgeAlert(log.id)}
                        className="text-[10px] px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded"
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
