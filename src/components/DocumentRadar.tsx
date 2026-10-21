import React, { useState } from 'react';
import { PrescribedDocument, Role } from '../types';
import { 
  CalendarClock, 
  FileCheck2, 
  AlertTriangle, 
  CheckCircle2, 
  FileSearch, 
  Upload, 
  ShieldCheck,
  Eye,
  Building2
} from 'lucide-react';

interface DocumentRadarProps {
  documents: PrescribedDocument[];
  currentRole: Role;
  onConfirmOCR: (docId: string) => void;
  onSubmitRenewal: (docId: string, newExpiry: string, newNumber: string) => void;
}

export const DocumentRadar: React.FC<DocumentRadarProps> = ({
  documents,
  currentRole,
  onConfirmOCR,
  onSubmitRenewal,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | '7D' | '30D' | '60D' | '90D'>('ALL');
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalExpiry, setRenewalExpiry] = useState('2036-10-31');
  const [renewalDocNumber, setRenewalDocNumber] = useState('LLD/MH/NM/2026-RENEWED-01');

  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  const filteredDocs = documents.filter(doc => {
    if (filterPeriod === '7D') return doc.daysRemaining <= 7;
    if (filterPeriod === '30D') return doc.daysRemaining <= 30;
    if (filterPeriod === '60D') return doc.daysRemaining <= 60;
    if (filterPeriod === '90D') return doc.daysRemaining <= 90;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0a2540] flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[#0f3c6e]" />
            <span>Prescribed Document Validity & Lease Expiry Radar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time validity surveillance for Registered 30-Year Land Leases, State Fire NOCs, Building Safety Certificates, and Trust Deeds.
          </p>
        </div>

        {/* Filter intervals */}
        <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded">
          <span className="text-slate-500 font-semibold px-2">Radar Window:</span>
          {(['ALL', '7D', '30D', '60D', '90D'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                filterPeriod === period
                  ? 'bg-[#0a2540] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {period === 'ALL' ? 'All Records' : `< ${period.replace('D', ' Days')}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col h-[650px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50 font-bold text-xs text-[#0a2540] uppercase tracking-wider flex justify-between">
            <span>Prescribed Documents</span>
            <span>Validity</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredDocs.map((doc) => {
              const isSelected = doc.id === selectedDoc?.id;
              const isCrit = doc.daysRemaining <= 7;
              const isSoon = doc.daysRemaining > 7 && doc.daysRemaining <= 30;

              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`p-3.5 transition-all cursor-pointer ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-[#0f3c6e]' : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-[#0a2540]">{doc.docType}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      isCrit ? 'bg-red-100 text-red-900 border border-red-300' :
                      isSoon ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      'bg-emerald-100 text-emerald-900'
                    }`}>
                      {doc.daysRemaining <= 0 ? 'EXPIRED' : `${doc.daysRemaining}d Left`}
                    </span>
                  </div>

                  <h5 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
                    {doc.institutionName}
                  </h5>

                  <div className="text-[11px] text-slate-500 flex justify-between items-center mt-2">
                    <span className="font-mono text-slate-600 truncate max-w-[180px]">
                      {doc.documentNumber}
                    </span>
                    <span>Expiry: {doc.expiryDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Dossier & OCR Assistant (7 Cols) */}
        {selectedDoc && (
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#0a2540]">
                      {selectedDoc.docType}
                    </h3>
                    <span className="bg-slate-100 text-slate-700 text-[11px] font-mono px-2 py-0.5 rounded">
                      Doc No: {selectedDoc.documentNumber}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Institution: <strong className="text-slate-800">{selectedDoc.institutionName}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                    selectedDoc.daysRemaining <= 7 ? 'bg-red-100 text-red-800' :
                    selectedDoc.daysRemaining <= 30 ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedDoc.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Validity Details Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Issuing Authority</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedDoc.issuedByAuthority}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Issue Date</span>
                  <span className="font-mono text-slate-800 mt-0.5 block">{selectedDoc.issueDate}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Expiry Date</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">{selectedDoc.expiryDate}</span>
                </div>
              </div>

              {/* AI-Assisted Document Intelligence & OCR Inspection Panel */}
              <div className="p-4 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold tracking-wide text-amber-400 uppercase">
                      Assisted Document Intelligence (OCR Extractor Preview)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      OCR Confidence: {selectedDoc.ocrExtraction.confidenceScore}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Extracted Title:</span>
                    <span className="font-mono text-slate-200">{selectedDoc.ocrExtraction.extractedDocType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Extracted Expiry Date:</span>
                    <span className="font-mono font-bold text-amber-300">{selectedDoc.ocrExtraction.extractedExpiryDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Lessor / Issuing Entity:</span>
                    <span className="font-mono text-slate-200">{selectedDoc.ocrExtraction.extractedLessor}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Plot / Survey Coordinates:</span>
                    <span className="font-mono text-slate-200">{selectedDoc.ocrExtraction.extractedPlotSurveyNo}</span>
                  </div>
                </div>

                {/* Human-In-The-Loop Validation Safeguard (Mandatory SIH Rule!) */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Human-in-the-loop: Regulatory officer must verify extracted values against scan.</span>
                  </div>

                  {selectedDoc.ocrExtraction.humanConfirmed ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      ✓ Officer Confirmed
                    </span>
                  ) : (
                    <button
                      onClick={() => onConfirmOCR(selectedDoc.id)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[11px]"
                    >
                      Confirm Extracted Metadata
                    </button>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2.5">
                <button
                  onClick={() => setShowRenewalModal(true)}
                  className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded shadow-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Submit Registered Renewal Document</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Renewal Submission */}
      {showRenewalModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-[#0a2540] border-b border-slate-100 pb-2">
              Submit Renewal for {selectedDoc.docType}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Registered Document Number</label>
                <input
                  type="text"
                  value={renewalDocNumber}
                  onChange={(e) => setRenewalDocNumber(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Extended Expiry Date</label>
                <input
                  type="date"
                  value={renewalExpiry}
                  onChange={(e) => setRenewalExpiry(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRenewalModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSubmitRenewal(selectedDoc.id, renewalExpiry, renewalDocNumber);
                  setShowRenewalModal(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold"
              >
                Submit Renewal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
