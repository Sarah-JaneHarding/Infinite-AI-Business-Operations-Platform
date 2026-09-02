import React, { useState } from 'react';
import { INITIAL_DOCUMENTS } from '../data/mockData';
import { DocumentItem } from '../types';
import { 
  BookOpen, 
  CheckCircle2, 
  FileCheck, 
  PenTool, 
  Search, 
  Filter, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock
} from 'lucide-react';

interface DocsAndRatifyProps {
  ratifiedCount: number;
  onRatifyPolicy: () => void;
}

export const DocsAndRatify: React.FC<DocsAndRatifyProps> = ({ ratifiedCount, onRatifyPolicy }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem>(INITIAL_DOCUMENTS[0]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [signingModal, setSigningModal] = useState(false);
  const [signatureName, setSignatureName] = useState('Sarah-Jane (CEO)');

  // Policy frameworks tracking (136 total)
  const totalPolicies = 136;
  const currentRatified = ratifiedCount;
  const percentRatified = Math.round((currentRatified / totalPolicies) * 100);

  const handleSignDocument = (doc: DocumentItem) => {
    const updated = documents.map(d => 
      d.id === doc.id ? { ...d, status: 'RATIFIED' as const, owner: `${signatureName}` } : d
    );
    setDocuments(updated);
    setSelectedDoc({ ...doc, status: 'RATIFIED' as const, owner: `${signatureName}` });
    setSigningModal(false);
    onRatifyPolicy();
  };

  const filteredDocs = documents.filter(d => {
    const matchType = selectedType === 'ALL' || d.type === selectedType;
    const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        d.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">L0 CONSTITUTION &amp; INSTITUTIONAL TRUTH</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            Document Library &amp; <span className="grad">Policy Ratification Center</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Audit and ratify the 136 foundational corporate policy frameworks ingested into Brain L0.
            Executes legal countersignatures under non-bypassable Human-in-the-Loop oversight (OQ-002).
          </p>
        </div>

        {/* Ratification Progress Bar */}
        <div className="panel p-3.5 space-y-1.5 min-w-[280px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8FA0C2] font-mono">136 Policies Ratified:</span>
            <strong className="text-[#22D3EE] font-mono">{currentRatified} / {totalPolicies} ({percentRatified}%)</strong>
          </div>
          <div className="w-full bg-[#0E1830] h-2 rounded-full overflow-hidden border border-[rgba(148,163,255,0.1)]">
            <div 
              className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] rounded-full transition-all duration-500"
              style={{ width: `${percentRatified}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Banner: Batch Ratification */}
      <div className="panel p-4 bg-gradient-to-r from-[#13203C] to-[#0A1226] border border-[#22D3EE]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/10 flex items-center justify-center text-[#22D3EE] shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#E9EDF8]">Pending Frameworks Signature (OQ-002)</h3>
            <p className="text-xs text-[#8FA0C2]">
              Countersign pending corporate bylaws, risk tolerance matrices, and sprint templates to advance pilot readiness.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            onRatifyPolicy();
            alert('Countersignature recorded: Appended 5 verified policy frameworks to Brain L0 Constitution with SHA-256 hash.');
          }}
          className="btn btn-p text-xs px-4 py-2 shrink-0 whitespace-nowrap"
        >
          <PenTool className="w-3.5 h-3.5 mr-1" />
          Batch Countersign Next 5 Policies
        </button>
      </div>

      {/* Filter and Search */}
      <div className="panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-xs">
          {['ALL', 'SPEC', 'POLICY', 'SOP', 'PLAN', 'AUDIT', 'LOG'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedType === t
                  ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40'
                  : 'bg-[#13203C] text-[#8FA0C2] hover:text-[#E9EDF8]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#8FA0C2] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents & bylaws..."
            className="inp pl-8 text-xs py-1"
          />
        </div>
      </div>

      {/* Two Column Document Workspace */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* Document List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[600px] overflow-y-auto">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDoc.id === doc.id;
            const isRatified = doc.status === 'RATIFIED' || doc.status === 'LIVE';

            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`panel2 p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-[#22D3EE] bg-[#13203C]' 
                    : 'hover:border-[#22D3EE]/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] text-[#22D3EE] font-bold bg-[#0E1830] px-2 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
                    {doc.id}
                  </span>
                  <span className={`chip text-[10px] ${
                    isRatified ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/40 text-amber-300'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#E9EDF8] mt-2 leading-tight">
                  {doc.title}
                </h3>

                <div className="flex items-center justify-between text-[11px] text-[#8FA0C2] mt-2 pt-2 border-t border-[rgba(148,163,255,0.08)]">
                  <span>Type: <strong className="text-[#E9EDF8]">{doc.type}</strong></span>
                  <span>Owner: {doc.owner}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Document Detailed Inspection */}
        <div className="lg:col-span-7 panel p-6 space-y-5">
          <div className="flex items-start justify-between border-b border-[rgba(148,163,255,0.1)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#22D3EE] font-bold">{selectedDoc.id}</span>
                <span className="chip text-[10px] border-emerald-500/30 text-emerald-400">
                  {selectedDoc.type} · v{selectedDoc.version}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#E9EDF8] mt-1">{selectedDoc.title}</h2>
              <p className="text-xs text-[#8FA0C2] mt-0.5">
                Custody: <strong className="text-[#E9EDF8]">{selectedDoc.owner}</strong> · Last Verified: {selectedDoc.lastUpdated}
              </p>
            </div>

            <button
              onClick={() => setSigningModal(true)}
              className="btn btn-p text-xs px-3.5 py-1.5"
            >
              <PenTool className="w-3.5 h-3.5 mr-1" />
              Countersign Document
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="panel2 p-3.5 space-y-1 bg-[#05070f]">
              <span className="text-[10px] font-mono text-[#8FA0C2] uppercase block">
                Cryptographic Integrity Verification:
              </span>
              <p className="font-mono text-[11px] text-[#22D3EE] truncate">
                SHA-256: d5a7e93b8214fa738129a8f4c029103e67184910248abefc91823719a82c4019
              </p>
            </div>

            <div className="panel2 p-4 space-y-2">
              <strong className="text-sm text-[#E9EDF8] block">Constitution Integration Summary</strong>
              <p className="text-[#8FA0C2] leading-relaxed">
                This document forms part of the verified corporate governance corpus. Once ratified, its rules, constraints,
                and execution procedures are embedded into the **Infinite Brain L0 Layer**, serving as a non-overridable reference
                boundary for all 46 departmental AI agents.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0E1830] border border-[rgba(148,163,255,0.08)]">
                <span className="text-[10px] text-[#8FA0C2] uppercase font-mono block">Enforcement Layer:</span>
                <span className="font-bold text-[#E9EDF8] mt-0.5 block">L0 Immutable Constitution</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0E1830] border border-[rgba(148,163,255,0.08)]">
                <span className="text-[10px] text-[#8FA0C2] uppercase font-mono block">Human Sign-off:</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">Required (Law 02)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signing Confirmation Modal */}
      {signingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="panel max-w-md w-full p-6 relative border border-[#22D3EE]/30 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#E9EDF8]">Executive Countersignature</h3>
            <p className="text-xs text-[#8FA0C2]">
              Executing statutory sign-off for <strong className="text-[#E9EDF8]">{selectedDoc.title}</strong>.
              This will update the Brain L0 policy tree rings with your authorized cryptographic credential.
            </p>

            <div>
              <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Signer Name &amp; Title:</label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="inp text-xs"
              />
            </div>

            <div className="p-3 rounded bg-[#05070f] text-[11px] font-mono text-[#8FA0C2] border border-[rgba(148,163,255,0.1)]">
              Digital Signature Authority: CEO &amp; Founding Partner (Cape Town, SA)
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSigningModal(false)}
                className="btn btn-g text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSignDocument(selectedDoc)}
                className="btn btn-p text-xs px-4"
              >
                Affix Legal Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
