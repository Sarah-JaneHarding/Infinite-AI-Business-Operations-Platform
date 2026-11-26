import React, { useEffect, useState } from 'react';
import { BookOpen, FileCode, ShieldCheck, Sparkles, Database, FileText, Layers, Wrench, GitFork } from 'lucide-react';
import { DocsAndRatify } from '../../legacy/components/DocsAndRatify';
import { Studio } from './Studio';
import { Library } from './Library';
import { Builders } from './Builders';
import { Integrations } from './Integrations';
import { useOps } from './store';
import { countRatified, listDocuments } from '../core/documents';

interface DocumentStudioProps {
  initialArtefactId?: string;
  initialDocId?: string;
}

type StudioTab = 'policy' | 'artefacts' | 'library' | 'builders' | 'integrations';

export function DocumentStudio({ initialArtefactId, initialDocId }: DocumentStudioProps) {
  const { p, actor, bump, go } = useOps();
  const [activeTab, setActiveTab] = useState<StudioTab>(initialArtefactId ? 'artefacts' : 'library');
  // Opening an artefact from another tab (the Library's "Send to review") switches to the artefacts tab.
  useEffect(() => { if (initialArtefactId) setActiveTab('artefacts'); }, [initialArtefactId]);
  // Counted from the stored artefacts, never from a number typed into the screen.
  const ratifiedCount = countRatified(p?.artefacts() ?? []);

  /**
   * The legacy screen's Ratify button. It no longer ratifies anything itself: a document that is in the Library goes on the
   * review board as a draft, where it is approved and countersigned like any other. The legacy list is not the Library, so a
   * document that is only there gets a pointer to the Library instead. Returns the message the screen shows.
   */
  const handleRatifyPolicy = async (docId: string): Promise<string> => {
    if (!p || !listDocuments(p.warehouse).some((d) => d.id === docId)) return 'Open this document from the Library to send it to review.';
    try {
      await p.promoteDocument(docId, actor);
      bump();
      go({ name: 'board' });
      return 'Sent to the review board. Nothing is ratified until it is approved and countersigned there.';
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not send it to review.';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Workspace Selector: Policy & Ops Docs vs Agent Generative Artefacts */}
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('policy')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'policy'
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen size={15} />
              <span>Operations &amp; Policy Document Editor</span>
              <span className="rounded bg-violet-900/40 px-1.5 py-0.5 text-[10px] font-mono text-violet-100">
                Ratification Center
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('artefacts')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === 'artefacts'
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Sparkles size={15} />
              <span>Agent Generative Artefacts Studio</span>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-700">
                Law 02 HITL
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 px-2 font-mono">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span className="hidden sm:inline">Non-bypassable Human Decision Gate (Law 02)</span>
          </div>
        </div>

        {/* Sub-tabs when inside the Agent Generative Artefacts Studio */}
        {activeTab !== 'policy' && (
          <div className="mt-2.5 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
            {[
              { id: 'artefacts' as const, label: 'Artefacts & Decisions', icon: <FileText size={13} /> },
              { id: 'library' as const, label: 'Library & Templates', icon: <Layers size={13} /> },
              { id: 'builders' as const, label: 'Agent, Widget & Artefact Builders', icon: <Wrench size={13} /> },
              { id: 'integrations' as const, label: 'Integrations & Webhooks', icon: <GitFork size={13} /> }
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={`btn text-xs py-1 px-3 flex items-center gap-1.5 ${
                  activeTab === sub.id ? 'primary font-bold' : 'bg-slate-100 text-slate-700'
                }`}
                onClick={() => setActiveTab(sub.id)}
              >
                {sub.icon}
                <span>{sub.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Render the selected workspace */}
      {activeTab === 'policy' ? (
        <div className="rounded-xl border border-slate-800 bg-[#070b19] p-3 sm:p-5 text-slate-100 shadow-md">
          <DocsAndRatify
            ratifiedCount={ratifiedCount}
            initialDocId={initialDocId || 'IA-SOP-001'}
            signerName={actor.name}
            onRatifyPolicy={handleRatifyPolicy}
            onNavigateToWarehouse={() => go({ name: 'warehouse' })}
          />
        </div>
      ) : activeTab === 'artefacts' ? (
        <Studio id={initialArtefactId} />
      ) : activeTab === 'library' ? (
        <Library />
      ) : activeTab === 'builders' ? (
        <Builders />
      ) : (
        <Integrations />
      )}
    </div>
  );
}
