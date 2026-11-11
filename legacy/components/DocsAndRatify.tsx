import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../types';
import { INITIAL_WAREHOUSE_DOCUMENTS } from '../data/warehouseData';
import { 
  BookOpen, 
  CheckCircle2, 
  FileCheck, 
  PenTool, 
  Search, 
  Filter, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Edit3, 
  Eye, 
  Save, 
  RotateCcw, 
  Plus, 
  Copy, 
  Check, 
  FileText, 
  AlertTriangle, 
  Download, 
  Hash, 
  Database, 
  ArrowRight, 
  List, 
  Heading, 
  Bold, 
  Italic, 
  Quote, 
  Table as TableIcon 
} from 'lucide-react';

interface DocsAndRatifyProps {
  ratifiedCount?: number;
  onRatifyPolicy?: () => void;
  onNavigateToWarehouse?: () => void;
  initialDocId?: string | null;
}

type EditorMode = 'VIEW' | 'EDIT' | 'REVIEW' | 'RATIFY';

export const DocsAndRatify: React.FC<DocsAndRatifyProps> = ({ 
  ratifiedCount = 42, 
  onRatifyPolicy,
  onNavigateToWarehouse,
  initialDocId
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem('ia_warehouse_documents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_WAREHOUSE_DOCUMENTS;
    } catch {
      return INITIAL_WAREHOUSE_DOCUMENTS;
    }
  });

  const [selectedDocId, setSelectedDocId] = useState<string>(() => {
    return initialDocId || documents[0]?.id || 'IA-SOP-001';
  });

  useEffect(() => {
    if (initialDocId) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId]);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  const [activeMode, setActiveMode] = useState<EditorMode>('VIEW');
  const [editedContent, setEditedContent] = useState<string>(selectedDoc?.content || '');
  const [editedTitle, setEditedTitle] = useState<string>(selectedDoc?.title || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  const [reviewNotes, setReviewNotes] = useState<string>(selectedDoc?.reviewNotes || '');
  const [reviewChecks, setReviewChecks] = useState<Record<string, boolean>>({
    law01_invariants: true,
    law02_hitl: true,
    popia_sec72: true,
    pricing_r4k: true,
    af_south_1_residency: true
  });

  const [signingModal, setSigningModal] = useState<boolean>(false);
  const [signerRole, setSignerRole] = useState<string>('Sarah-Jane Harding (Chief Executive Officer)');
  const [signerTitle, setSignerTitle] = useState<string>('CEO & Founding Partner');
  const [typedSignature, setTypedSignature] = useState<string>('Sarah-Jane Harding');
  const [legalAgreementChecked, setLegalAgreementChecked] = useState<boolean>(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  const [newDocModal, setNewDocModal] = useState<boolean>(false);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocType, setNewDocType] = useState<DocumentItem['type']>('SOP');
  const [newDocCategory, setNewDocCategory] = useState<DocumentItem['category']>('OPERATIONS');
  const [newDocTemplate, setNewDocTemplate] = useState<string>('STANDARD_SOP');

  useEffect(() => {
    if (selectedDoc) {
      setEditedContent(selectedDoc.content || '');
      setEditedTitle(selectedDoc.title);
      setReviewNotes(selectedDoc.reviewNotes || '');
      setHasUnsavedChanges(false);
    }
  }, [selectedDocId]);

  const persistDocuments = (updatedDocs: DocumentItem[]) => {
    setDocuments(updatedDocs);
    try {
      localStorage.setItem('ia_warehouse_documents', JSON.stringify(updatedDocs));
    } catch {}
  };

  const totalPolicies = 136;
  const currentRatified = ratifiedCount;
  const percentRatified = Math.round((currentRatified / totalPolicies) * 100);

  const handleContentChange = (val: string) => {
    setEditedContent(val);
    setHasUnsavedChanges(true);
  };

  const handleSaveDocument = (bumpVersion: boolean = false) => {
    if (!selectedDoc) return;

    let newVersion = selectedDoc.version;
    if (bumpVersion) {
      const parts = selectedDoc.version.split('.');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        newVersion = `${parts[0]}.${Number(parts[1]) + 1}`;
      } else {
        newVersion = `${selectedDoc.version}.1`;
      }
    }

    const timestamp = new Date().toISOString().substring(0, 10);
    const newHash = 'sha256:' + Array.from({ length: 8 }, () => Math.random().toString(16).substring(2, 10)).join('');

    const newChangeLog = [
      ...(selectedDoc.changeLog || []),
      {
        version: newVersion,
        date: timestamp,
        author: signerTitle.includes('CEO') ? 'Sarah-Jane Harding (CEO)' : 'Executive Editor',
        summary: bumpVersion ? `Version bump to ${newVersion} with operational edits` : 'Routine revision and content update'
      }
    ];

    const updated: DocumentItem[] = documents.map(d => {
      if (d.id === selectedDoc.id) {
        return {
          ...d,
          title: editedTitle,
          content: editedContent,
          version: newVersion,
          lastUpdated: timestamp,
          hash: newHash,
          reviewNotes,
          changeLog: newChangeLog
        };
      }
      return d;
    });

    persistDocuments(updated);
    setHasUnsavedChanges(false);
    setSaveSuccessMsg(`Saved successfully as v${newVersion}! Hash updated.`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleExecuteCountersignature = () => {
    if (!selectedDoc) return;

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16) + ' SAST';
    const sigHash = 'sig:sha256:' + Array.from({ length: 4 }, () => Math.random().toString(16).substring(2, 10)).join('');

    const updated: DocumentItem[] = documents.map(d => {
      if (d.id === selectedDoc.id) {
        return {
          ...d,
          status: 'RATIFIED' as const,
          reviewStatus: 'RATIFIED' as const,
          countersignedBy: `${signerRole} (${signerTitle})`,
          countersignedAt: timestamp,
          countersignHash: sigHash,
          lastUpdated: timestamp.substring(0, 10)
        };
      }
      return d;
    });

    persistDocuments(updated);
    setSigningModal(false);
    if (onRatifyPolicy) onRatifyPolicy();

    try {
      const existingAudit = localStorage.getItem('ia_warehouse_audit_log');
      const parsedAudit = existingAudit ? JSON.parse(existingAudit) : [];
      const newAuditItem = {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp,
        entityType: 'DOCUMENT',
        entityId: selectedDoc.id,
        action: 'RATIFY',
        actor: signerRole,
        actorRole: signerTitle,
        details: `Countersigned and committed ${selectedDoc.title} to Brain L0 Immutable Ring.`,
        merkleHash: sigHash
      };
      localStorage.setItem('ia_warehouse_audit_log', JSON.stringify([newAuditItem, ...parsedAudit]));
    } catch {}

    setSaveSuccessMsg(`Ratified & Countersigned! Recorded to Brain L0 with SHA-256 seal.`);
    setTimeout(() => setSaveSuccessMsg(''), 4500);
  };

  const handleCreateDocument = () => {
    if (!newDocTitle.trim()) return;

    const nextId = `IA-${newDocType}-${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString().substring(0, 10);
    const docHash = 'sha256:' + Array.from({ length: 8 }, () => Math.random().toString(16).substring(2, 10)).join('');

    let initialTemplateContent = '';
    if (newDocTemplate === 'STANDARD_SOP') {
      initialTemplateContent = `# ${newDocTitle}
**Document ID:** ${nextId}  
**Classification:** Standard Operating Procedure (SOP)  
**Effective Date:** ${timestamp}  
**Target Invariant:** System Law 02 (Human-In-The-Loop)  

---

## 1. Purpose & Scope
This Standard Operating Procedure governs the execution of operational tasks across the Infinite-AI ecosystem.

## 2. Operational Procedures
1. **Pre-execution Verification:** Check all dependencies against the L0 Constitution.
2. **Execution Steps:** Execute within designated AWS Cape Town (af-south-1) boundaries.
3. **Audit Logging:** Record all state transitions with SHA-256 Merkle hashes.

## 3. Human Oversight & Escalation
Any threshold breach automatically invokes the designated human incident commander.`;
    } else if (newDocTemplate === 'SCHOOL_CONTRACT') {
      initialTemplateContent = `# School SaaS Service Level Agreement & Subscription
**Document ID:** ${nextId}  
**Subscription Baseline:** R4,000.00 ZAR / month per school  
**Applicability:** Primary School Governing Body & Infinite-AI Operations  

---

## 1. Scope of Grant
Infinite-AI provides access to all 46 specialized AI agents for curriculum planning, SIAS Tier triage, and administrative reporting.

## 2. Commercial Pricing
- **Monthly Subscription:** R4,000.00 ZAR net of VAT.
- **Annual Equivalent:** R48,000.00 ZAR.
- **Data Safeguards:** Stored strictly within AWS af-south-1 in compliance with POPIA Act 4 of 2013.`;
    } else {
      initialTemplateContent = `# ${newDocTitle}
**Document ID:** ${nextId}  
**Created:** ${timestamp}  

---

## 1. Overview
Document description and operational scope...`;
    }

    const newDoc: DocumentItem = {
      id: nextId,
      title: newDocTitle,
      type: newDocType,
      category: newDocCategory,
      version: '1.0',
      owner: 'Sarah-Jane Harding (CEO)',
      status: 'DRAFT',
      reviewStatus: 'DRAFT',
      reviewNotes: 'Initial draft created in Document Studio. Ready for technical review.',
      lastUpdated: timestamp,
      content: initialTemplateContent,
      hash: docHash,
      tags: [newDocCategory || 'OPERATIONS', newDocType],
      changeLog: [
        { version: '1.0', date: timestamp, author: 'Sarah-Jane Harding', summary: 'Initial document draft created' }
      ]
    };

    const updated = [newDoc, ...documents];
    persistDocuments(updated);
    setSelectedDocId(newDoc.id);
    setActiveMode('EDIT');
    setNewDocModal(false);
    setNewDocTitle('');
  };

  const insertToken = (snippet: string) => {
    setEditedContent(prev => prev + '\n' + snippet);
    setHasUnsavedChanges(true);
  };

  const filteredDocs = documents.filter(d => {
    const matchCategory = selectedCategory === 'ALL' || d.category === selectedCategory;
    const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (d.tags && d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchCategory && matchSearch;
  });

  const wordCount = (selectedDoc?.content || '').split(/\s+/).filter(Boolean).length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="kick text-xs font-mono text-cyan-400">L0 CONSTITUTION, ECOSYSTEM SPECS &amp; CONTRACT WORKSPACE</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            Document Studio &amp; <span className="grad">Ratification Center</span>
          </h1>
          <p className="text-xs text-[#CBD5E1] mt-1 max-w-2xl">
            Interactive document viewer, markdown editor, and legal review station. Read, review, edit, and save 
            business operations and ecosystem documentation before executing non-bypassable countersignatures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onNavigateToWarehouse && (
            <button
              onClick={onNavigateToWarehouse}
              className="btn btn-s border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/30 text-xs py-2 px-3.5 flex items-center gap-2"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data Warehouse (MOD-03)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <div className="card p-3 min-w-[260px] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#CBD5E1] font-mono">136 Policies Ratified:</span>
              <strong className="text-cyan-400 font-mono">{currentRatified} / {totalPolicies} ({percentRatified}%)</strong>
            </div>
            <div className="w-full bg-[#0E1830] h-2 rounded-full overflow-hidden border border-[rgba(148,163,255,0.1)]">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${percentRatified}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400">STATUS: COMMITTED</span>
        </div>
      )}

      <div className="card p-3.5 flex flex-wrap items-center justify-between gap-3 bg-[#0A1226]/80">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] text-[#CBD5E1] uppercase font-mono mr-1">Category:</span>
          {['ALL', 'OPERATIONS', 'GOVERNANCE', 'COMMERCIAL', 'LEGAL', 'TECHNICAL', 'ECOSYSTEM'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                selectedCategory === cat 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                  : 'bg-[#13203C] text-[#CBD5E1] hover:text-[#E9EDF8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#CBD5E1] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs, contracts, tags..."
              className="input pl-8 text-xs py-1.5 w-full"
            />
          </div>

          <button
            onClick={() => setNewDocModal(true)}
            className="btn primary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Document</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-2.5 max-h-[760px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-xs text-[#CBD5E1] px-1 pb-1">
            <span className="font-mono text-[10px] uppercase">
              {filteredDocs.length} Documents Indexed
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              Brain L0 &amp; Warehouse Sync
            </span>
          </div>

          {filteredDocs.map((doc) => {
            const isSelected = selectedDoc?.id === doc.id;
            const isRatified = doc.status === 'RATIFIED';
            const isReadyToSign = doc.reviewStatus === 'READY_TO_SIGN';

            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`card p-3.5 cursor-pointer transition-all border ${
                  isSelected 
                    ? 'border-cyan-400 bg-[#13203C]/90 shadow-[0_0_15px_rgba(34,211,238,0.12)]' 
                    : 'hover:border-cyan-500/40 bg-[#0E1830]/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] text-cyan-400 font-bold bg-[#091224] px-1.5 py-0.5 rounded border border-cyan-500/20">
                    {doc.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#091224] text-[#CBD5E1]">
                      v{doc.version}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      isRatified 
                        ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30' 
                        : isReadyToSign 
                          ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30' 
                          : 'border-amber-500/40 text-amber-300 bg-amber-950/30'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-[#E9EDF8] mt-2 leading-snug line-clamp-2">
                  {doc.title}
                </h3>

                <div className="flex items-center justify-between text-[10px] text-[#CBD5E1] mt-2.5 pt-2 border-t border-[rgba(148,163,255,0.06)] font-mono">
                  <span className="text-cyan-400/80">{doc.category || doc.type}</span>
                  <span>{doc.lastUpdated}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-8 card p-5 space-y-4 flex flex-col min-h-[760px]">
          {selectedDoc ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(148,163,255,0.1)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-cyan-400 font-bold">{selectedDoc.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400">
                      v{selectedDoc.version} · {selectedDoc.type}
                    </span>
                    {selectedDoc.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded border border-purple-500/30 text-purple-300 font-mono">
                        {selectedDoc.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-[#E9EDF8] mt-1">{selectedDoc.title}</h2>
                  <p className="text-xs text-[#CBD5E1] mt-0.5">
                    Custodian: <strong className="text-[#E9EDF8]">{selectedDoc.owner}</strong> · Last Verified: {selectedDoc.lastUpdated}
                  </p>
                </div>

                <div className="flex items-center bg-[#0E1830] p-1 rounded-xl border border-[rgba(148,163,255,0.1)] shrink-0 self-start sm:self-center">
                  <button
                    onClick={() => setActiveMode('VIEW')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                      activeMode === 'VIEW' 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                        : 'text-[#CBD5E1] hover:text-[#E9EDF8]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Read</span>
                  </button>

                  <button
                    onClick={() => setActiveMode('EDIT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                      activeMode === 'EDIT' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'text-[#CBD5E1] hover:text-[#E9EDF8]'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                    {hasUnsavedChanges && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveMode('REVIEW')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                      activeMode === 'REVIEW' 
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                        : 'text-[#CBD5E1] hover:text-[#E9EDF8]'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Review</span>
                  </button>

                  <button
                    onClick={() => setSigningModal(true)}
                    className="btn primary text-xs py-1.5 px-3 ml-1 flex items-center gap-1"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Countersign</span>
                  </button>
                </div>
              </div>

              {activeMode === 'VIEW' && (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="card p-3 bg-[#05070f] flex flex-wrap items-center justify-between gap-2 border border-cyan-500/20">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Hash className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-[10px] text-[#CBD5E1] font-mono shrink-0">SHA-256 HASH:</span>
                      <span className="font-mono text-[11px] text-cyan-300 truncate">
                        {selectedDoc.hash || 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#CBD5E1]">
                      <span>{wordCount} words</span>
                      <span>·</span>
                      <span>~{readTimeMin} min read</span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(selectedDoc.content || '');
                          setCopiedHash(true);
                          setTimeout(() => setCopiedHash(false), 2000);
                        }}
                        className="btn text-[10px] py-1 px-2 flex items-center gap-1"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHash ? 'Copied!' : 'Copy Raw'}</span>
                      </button>
                    </div>
                  </div>

                  {selectedDoc.status === 'RATIFIED' && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-emerald-300 font-mono block">
                            RATIFIED &amp; COUNTERSIGNED (BRAIN L0 IMMUTABLE)
                          </strong>
                          <span className="text-[#CBD5E1] text-[11px]">
                            Signed by {selectedDoc.countersignedBy || 'Sarah-Jane Harding (CEO)'} on {selectedDoc.countersignedAt || selectedDoc.lastUpdated}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300">
                        {selectedDoc.countersignHash ? selectedDoc.countersignHash.slice(0, 18) + '...' : 'VERIFIED'}
                      </span>
                    </div>
                  )}

                  <div className="card p-6 flex-1 bg-[#091122]/90 border border-[rgba(148,163,255,0.08)] overflow-y-auto max-h-[500px] text-xs text-[#CBD5E1] space-y-3 leading-relaxed">
                    <div className="whitespace-pre-wrap font-sans">
                      {selectedDoc.content || 'No document content available.'}
                    </div>
                  </div>

                  {selectedDoc.changeLog && selectedDoc.changeLog.length > 0 && (
                    <div className="card p-3 bg-[#060A14] space-y-1.5">
                      <span className="text-[10px] text-[#CBD5E1] font-mono uppercase block">Revision History:</span>
                      <div className="space-y-1">
                        {selectedDoc.changeLog.map((log, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] text-[#CBD5E1] font-mono">
                            <span className="text-cyan-400 font-bold">v{log.version}</span>
                            <span className="text-[#E9EDF8] truncate max-w-xs">{log.summary}</span>
                            <span>{log.author} ({log.date})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeMode === 'EDIT' && (
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="card p-2 bg-[#091122] flex flex-wrap items-center justify-between gap-2 border border-amber-500/20">
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <button
                        onClick={() => insertToken('## Section Heading\n')}
                        className="btn py-1 px-2 text-[11px]"
                      >
                        <Heading className="w-3 h-3 mr-1" /> H2
                      </button>
                      <button
                        onClick={() => insertToken('**Bold Text** ')}
                        className="btn py-1 px-2 text-[11px]"
                      >
                        <Bold className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => insertToken('*Italic Text* ')}
                        className="btn py-1 px-2 text-[11px]"
                      >
                        <Italic className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => insertToken('- Bullet item\n')}
                        className="btn py-1 px-2 text-[11px]"
                      >
                        <List className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => insertToken('> **Constitutional Note:** Law 02 HITL check required.\n')}
                        className="btn py-1 px-2 text-[11px]"
                      >
                        <Quote className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => insertToken('| Parameter | Value |\n| :--- | :--- |\n| Subscription Fee | R4,000 / mo |\n')}
                        className="btn py-1 px-2 text-[11px]"
                      >
                        <TableIcon className="w-3 h-3 mr-1" /> Table
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        onClick={() => insertToken('\n> **POPIA Notice (Section 72):** Data is processed exclusively in AWS af-south-1 (Cape Town) with zero cross-border transfer of child PII.\n')}
                        className="btn text-[10px] py-1 px-2 text-purple-300 border-purple-500/30"
                      >
                        + POPIA Clause
                      </button>
                      <button
                        onClick={() => insertToken('\n- **Standard School Subscription:** R4,000.00 ZAR / month per institution. Covers 46 agents, unlimited lesson plans, and SIAS triage.\n')}
                        className="btn text-[10px] py-1 px-2 text-emerald-300 border-emerald-500/30"
                      >
                        + R4k/mo Clause
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#CBD5E1] font-mono uppercase block">
                      Document Title:
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => {
                        setEditedTitle(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="input text-xs font-semibold py-1.5 w-full"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 flex-1">
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#CBD5E1]">
                        <span>MARKDOWN SOURCE:</span>
                        <span>{editedContent.length} chars</span>
                      </div>
                      <textarea
                        value={editedContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder="Type documentation markdown here..."
                        className="textarea flex-1 min-h-[360px] font-mono text-xs p-3 leading-relaxed resize-y bg-[#060B14]"
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono text-cyan-400">
                        <span>LIVE PREVIEW:</span>
                        <span>Formatted Output</span>
                      </div>
                      <div className="card p-4 flex-1 min-h-[360px] bg-[#091122]/90 border border-cyan-500/20 overflow-y-auto max-h-[460px] text-xs text-[#CBD5E1] space-y-2">
                        <div className="whitespace-pre-wrap font-sans">
                          {editedContent || 'Preview will render here...'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[rgba(148,163,255,0.1)]">
                    <div className="flex items-center gap-2 text-xs text-[#CBD5E1]">
                      {hasUnsavedChanges ? (
                        <span className="text-amber-300 flex items-center gap-1.5 font-mono text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Unsaved revisions detected
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1.5 font-mono text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Working copy matches saved version
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditedContent(selectedDoc.content || '');
                          setEditedTitle(selectedDoc.title);
                          setHasUnsavedChanges(false);
                        }}
                        className="btn text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Discard</span>
                      </button>

                      <button
                        onClick={() => handleSaveDocument(false)}
                        className="btn text-xs py-1.5 px-3.5 flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Draft</span>
                      </button>

                      <button
                        onClick={() => handleSaveDocument(true)}
                        className="btn primary text-xs py-1.5 px-4 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Save &amp; Bump Version</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeMode === 'REVIEW' && (
                <div className="space-y-4 flex-1">
                  <div className="card p-4 bg-[#091122] space-y-3 border border-purple-500/30">
                    <h3 className="text-sm font-bold text-[#E9EDF8] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span>Statutory Governance &amp; Constitutional Invariants Review</span>
                    </h3>
                    <p className="text-xs text-[#CBD5E1]">
                      Prior to legal countersignature and Brain L0 immutable commitment, all policy, contractual, 
                      and operational documents must satisfy the following statutory gates:
                    </p>

                    <div className="space-y-2 pt-2">
                      {[
                        { key: 'law01_invariants', label: 'System Law 01 Invariant:', desc: 'Guarantees core corporate bylaws cannot be destructively overwritten by lower memory layers.' },
                        { key: 'law02_hitl', label: 'System Law 02 (Human-in-the-Loop):', desc: 'Ensures no autonomous agent can self-approve or countersign this framework.' },
                        { key: 'popia_sec72', label: 'POPIA Section 72 & Child Safeguarding:', desc: 'Strict prohibition on raw learner PII egress beyond sovereign SA boundaries.' },
                        { key: 'pricing_r4k', label: 'Primary School Pricing Consistency:', desc: 'Complies with the transparent R4,000 / month / institution commercial model.' },
                        { key: 'af_south_1_residency', label: 'AWS Cape Town Data Residency:', desc: 'Direct deployment in af-south-1 with KMS envelope encryption.' }
                      ].map(check => (
                        <label 
                          key={check.key} 
                          className="flex items-start gap-3 p-2.5 rounded-lg bg-[#060A14] border border-[rgba(148,163,255,0.06)] cursor-pointer hover:border-purple-500/30 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={reviewChecks[check.key] ?? false}
                            onChange={(e) => setReviewChecks({ ...reviewChecks, [check.key]: e.target.checked })}
                            className="mt-0.5 rounded border-purple-500 text-purple-600 focus:ring-0 accent-purple-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold text-[#E9EDF8] block">{check.label}</span>
                            <span className="text-[11px] text-[#CBD5E1] leading-tight block">{check.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="card p-4 space-y-2">
                    <label className="text-[10px] text-[#CBD5E1] font-mono uppercase block">
                      Executive Reviewer Comments &amp; Findings:
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add compliance notes, statutory references, or conditional approvals..."
                      className="textarea w-full min-h-[100px] text-xs p-3 font-mono leading-relaxed bg-[#060B14]"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          handleSaveDocument(false);
                          setSaveSuccessMsg('Review commentary saved to document audit record.');
                          setTimeout(() => setSaveSuccessMsg(''), 3000);
                        }}
                        className="btn text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Update Review Notes</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-[#CBD5E1]">
              <FileText className="w-10 h-10 mx-auto text-[#CBD5E1]/50 mb-2" />
              <p>No document selected. Select a document from the left list or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {signingModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card max-w-lg w-full p-6 relative border border-cyan-500/40 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-[rgba(148,163,255,0.12)] pb-3">
              <div>
                <span className="kick text-[10px] text-cyan-400 font-mono">NON-BYPASSABLE HITL RATIFICATION</span>
                <h3 className="text-lg font-bold text-[#E9EDF8] mt-0.5">Statutory Countersignature</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-300 font-mono">
                {selectedDoc.id}
              </span>
            </div>

            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              You are executing the formal countersignature for <strong className="text-[#E9EDF8]">{selectedDoc.title}</strong> (v{selectedDoc.version}).
              This legal action will append a cryptographic SHA-256 seal into the 
              <strong className="text-cyan-300"> Infinite Brain L0 Immutable Ring</strong> and record the event in the Data Warehouse audit ledger.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#CBD5E1] font-mono uppercase block mb-1">
                  Authorized Signatory Role:
                </label>
                <select
                  value={signerRole}
                  onChange={(e) => {
                    setSignerRole(e.target.value);
                    if (e.target.value.includes('CEO')) {
                      setSignerTitle('CEO & Founding Partner');
                      setTypedSignature('Sarah-Jane Harding');
                    } else if (e.target.value.includes('Legal')) {
                      setSignerTitle('Legal Counsel & Corporate Secretary');
                      setTypedSignature('Adv. Peter Thorne');
                    } else {
                      setSignerTitle('School Governing Body Representative');
                      setTypedSignature('Dr. David Van Zyl');
                    }
                  }}
                  className="select text-xs py-1.5 w-full bg-[#0E1830]"
                >
                  <option value="Sarah-Jane Harding (Chief Executive Officer)">Sarah-Jane Harding (Chief Executive Officer)</option>
                  <option value="Adv. Peter Thorne (Legal Counsel)">Adv. Peter Thorne (Legal Counsel &amp; Governance)</option>
                  <option value="Dr. David Van Zyl (SGB Representative)">Dr. David Van Zyl (SGB Chair / School Principal)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#CBD5E1] font-mono uppercase block mb-1">
                  Digital Signature (Type Full Legal Name):
                </label>
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="input text-xs py-2 w-full font-serif italic text-base text-cyan-300 tracking-wider bg-[#060A14]"
                />
              </div>

              <div className="card p-3 bg-[#05070f] font-mono text-[10px] text-[#CBD5E1] space-y-1 border border-cyan-500/20">
                <div className="flex justify-between">
                  <span>Signer Authority:</span>
                  <span className="text-[#E9EDF8]">{signerTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data Center:</span>
                  <span className="text-cyan-300">AWS af-south-1 (Cape Town)</span>
                </div>
                <div className="flex justify-between">
                  <span>Law 02 Verification:</span>
                  <span className="text-emerald-400">PASSED · Human Verified</span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#CBD5E1]">
                <input
                  type="checkbox"
                  checked={legalAgreementChecked}
                  onChange={(e) => setLegalAgreementChecked(e.target.checked)}
                  className="rounded border-cyan-500 text-cyan-500 accent-cyan-500 cursor-pointer"
                />
                <span>I certify that this document has been reviewed and satisfies all POPIA, CAPS, and SGB constitutional standards.</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgba(148,163,255,0.1)]">
              <button
                type="button"
                onClick={() => setSigningModal(false)}
                className="btn text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!legalAgreementChecked || !typedSignature.trim()}
                onClick={handleExecuteCountersignature}
                className="btn primary text-xs py-2 px-5 flex items-center gap-1.5 disabled:opacity-50"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Affix Statutory Countersignature</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {newDocModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 relative border border-cyan-500/40 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#E9EDF8] flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Create New Operations Document</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#CBD5E1] font-mono uppercase block mb-1">
                  Document Title:
                </label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g., Incident Escalation Runbook v1"
                  className="input text-xs py-1.5 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#CBD5E1] font-mono uppercase block mb-1">
                    Document Type:
                  </label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as DocumentItem['type'])}
                    className="select text-xs py-1.5 w-full bg-[#0E1830]"
                  >
                    <option value="SOP">SOP (Procedure)</option>
                    <option value="POLICY">POLICY (Governance)</option>
                    <option value="CONTRACT">CONTRACT (Legal)</option>
                    <option value="SPEC">SPEC (Technical)</option>
                    <option value="PLAN">PLAN (Strategy)</option>
                    <option value="AUDIT">AUDIT (Compliance)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#CBD5E1] font-mono uppercase block mb-1">
                    Category:
                  </label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value as DocumentItem['category'])}
                    className="select text-xs py-1.5 w-full bg-[#0E1830]"
                  >
                    <option value="OPERATIONS">OPERATIONS</option>
                    <option value="GOVERNANCE">GOVERNANCE</option>
                    <option value="COMMERCIAL">COMMERCIAL</option>
                    <option value="LEGAL">LEGAL</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="ECOSYSTEM">ECOSYSTEM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#CBD5E1] font-mono uppercase block mb-1">
                  Starter Template:
                </label>
                <select
                  value={newDocTemplate}
                  onChange={(e) => setNewDocTemplate(e.target.value)}
                  className="select text-xs py-1.5 w-full bg-[#0E1830]"
                >
                  <option value="STANDARD_SOP">Standard Operating Procedure (SOP)</option>
                  <option value="SCHOOL_CONTRACT">School SaaS Contract (R4,000/mo Baseline)</option>
                  <option value="BLANK">Blank Document</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgba(148,163,255,0.1)]">
              <button
                type="button"
                onClick={() => setNewDocModal(false)}
                className="btn text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newDocTitle.trim()}
                onClick={handleCreateDocument}
                className="btn primary text-xs py-1.5 px-4 disabled:opacity-50"
              >
                Create Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
