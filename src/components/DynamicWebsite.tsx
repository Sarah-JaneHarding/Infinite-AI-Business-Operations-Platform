import React, { useState, useEffect } from 'react';
import { DEFAULT_PAGES } from '../data/websitePages';
import { WebPageItem } from '../types';
import { 
  Globe, 
  FileText, 
  Edit3, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Check, 
  ExternalLink, 
  History, 
  BookOpen, 
  Eye, 
  Copy,
  ChevronRight,
  ShieldAlert,
  Search,
  CheckCircle2
} from 'lucide-react';

export const DynamicWebsite: React.FC = () => {
  // Load pages from localStorage or fallback to defaults
  const [pages, setPages] = useState<WebPageItem[]>(() => {
    try {
      const saved = localStorage.getItem('ia_website_pages');
      return saved ? JSON.parse(saved) : DEFAULT_PAGES;
    } catch {
      return DEFAULT_PAGES;
    }
  });

  const [selectedPageId, setSelectedPageId] = useState<string>(DEFAULT_PAGES[0].id);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<WebPageItem>(DEFAULT_PAGES[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // New Page Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageCategory, setNewPageCategory] = useState('Operations');
  const [newPageContent, setNewPageContent] = useState('# New Operational Specification\n\nEnter content here...');

  // Selected active page
  const activePage = pages.find(p => p.id === selectedPageId) || pages[0];

  useEffect(() => {
    setEditForm(activePage);
    setIsEditing(false);
  }, [selectedPageId, pages]);

  // Persist pages
  const savePagesToStorage = (updated: WebPageItem[]) => {
    setPages(updated);
    try {
      localStorage.setItem('ia_website_pages', JSON.stringify(updated));
    } catch {}
  };

  // Handle save edits
  const handleSaveEdit = () => {
    const nextVersion = (parseFloat(editForm.version) + 0.1).toFixed(1);
    const updatedPage: WebPageItem = {
      ...editForm,
      version: nextVersion,
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Sarah-Jane (CEO Sign-off)'
    };

    const updated = pages.map(p => p.id === updatedPage.id ? updatedPage : p);
    savePagesToStorage(updated);
    setIsEditing(false);

    setSaveToast(`Page "${updatedPage.title}" updated to v${nextVersion}`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Handle add new page
  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;

    const slug = newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newPage: WebPageItem = {
      id: `page-${Date.now()}`,
      slug,
      title: newPageTitle,
      category: newPageCategory,
      content: newPageContent,
      version: '1.0',
      lastModified: new Date().toISOString().split('T')[0],
      author: 'Executive Office',
      isSystem: false
    };

    const updated = [...pages, newPage];
    savePagesToStorage(updated);
    setSelectedPageId(newPage.id);
    setShowAddModal(false);
    setNewPageTitle('');

    setSaveToast(`Created new dynamic page: "${newPage.title}"`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Handle delete custom page
  const handleDeletePage = (id: string) => {
    const target = pages.find(p => p.id === id);
    if (target?.isSystem) {
      alert('System-required governance pages cannot be deleted.');
      return;
    }
    if (confirm(`Are you sure you want to remove the page "${target?.title}"?`)) {
      const updated = pages.filter(p => p.id !== id);
      savePagesToStorage(updated);
      setSelectedPageId(updated[0]?.id || DEFAULT_PAGES[0].id);
    }
  };

  // Handle reset to factory defaults
  const handleResetDefaults = () => {
    if (confirm('Reset all pages to initial Infinite-AI architecture specification?')) {
      savePagesToStorage(DEFAULT_PAGES);
      setSelectedPageId(DEFAULT_PAGES[0].id);
    }
  };

  // Filtered pages list
  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group pages by category
  const categories = Array.from(new Set(filteredPages.map(p => p.category)));

  // Simple Markdown-like renderer
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-bold text-[#E9EDF8] mt-4 mb-2 pb-2 border-b border-[rgba(148,163,255,0.12)]">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-bold text-[#22D3EE] mt-4 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-bold text-amber-300 mt-3 mb-1">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="panel2 p-3 my-2 border-l-4 border-l-[#22D3EE] text-xs text-[#E9EDF8] italic">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-[#8FA0C2] my-1 ml-2">
            <span className="text-[#22D3EE] mt-1 font-bold">•</span>
            <span>{line.replace(/^[-*]\s+/, '')}</span>
          </div>
        );
      }
      if (line.startsWith('---')) {
        return <hr key={idx} className="my-3 border-[rgba(148,163,255,0.1)]" />;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-xs text-[#8FA0C2] leading-relaxed my-1">{line}</p>;
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">DYNAMIC INTERNAL GOVERNANCE PORTAL</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            Multi-Page Business Website &amp; <span className="grad">Governance Library</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Live internal governance site featuring editable pages, markdown authoring, version control,
            modular page creation, and centralized operational playbooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-p text-xs px-3.5"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add New Page
          </button>
          <button
            onClick={handleResetDefaults}
            title="Reset to initial factory template"
            className="btn btn-g text-xs p-2 text-[#8FA0C2] hover:text-[#E9EDF8]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toast alert */}
      {saveToast && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Two Column Workspace: Page Tree vs Page Content */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* Sidebar: Page Navigator */}
        <div className="lg:col-span-4 panel p-4 space-y-4 max-h-[750px] overflow-y-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="kick">PAGE REPOSITORY ({pages.length})</span>
              <span className="text-[10px] text-[#8FA0C2] font-mono">v1.0 Live</span>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8FA0C2] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages & categories..."
                className="inp pl-8 text-xs py-1"
              />
            </div>
          </div>

          {/* Grouped Category Tree */}
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1">
                <p className="text-[10px] font-mono font-bold tracking-wider text-[#8FA0C2] uppercase px-1">
                  {cat}
                </p>
                <div className="space-y-0.5">
                  {filteredPages
                    .filter(p => p.category === cat)
                    .map((p) => {
                      const isSelected = p.id === selectedPageId;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-[#13203C] border-[#22D3EE]/40 text-[#22D3EE] font-semibold'
                              : 'bg-transparent border-transparent text-[#8FA0C2] hover:bg-[#0E1830] hover:text-[#E9EDF8]'
                          }`}
                          onClick={() => setSelectedPageId(p.id)}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{p.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[#0E1830] text-[#8FA0C2]">
                              v{p.version}
                            </span>
                            {!p.isSystem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePage(p.id);
                                }}
                                className="text-[#8FA0C2] hover:text-rose-400 p-0.5"
                                title="Delete custom page"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Viewer / Editor */}
        <div className="lg:col-span-8 panel p-6 flex flex-col justify-between min-h-[620px]">
          {isEditing ? (
            /* Editing Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[rgba(148,163,255,0.1)] pb-3">
                <div>
                  <span className="text-[10px] kick text-amber-400">PAGE AUTHORING STUDIO</span>
                  <h2 className="text-base font-bold text-[#E9EDF8]">Editing: {activePage.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-g text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="btn btn-p text-xs px-4"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save &amp; Increment Version
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Page Title:</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="inp text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Category:</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="inp text-xs"
                  >
                    <option value="Corporate Strategy">Corporate Strategy</option>
                    <option value="Product Development">Product Development</option>
                    <option value="Engineering & DevOps">Engineering &amp; DevOps</option>
                    <option value="Operations">Operations</option>
                    <option value="Governance & Security">Governance &amp; Security</option>
                    <option value="CRM & Sales">CRM &amp; Sales</option>
                    <option value="Finance & Accounting">Finance &amp; Accounting</option>
                    <option value="Custom Pages">Custom Pages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Markdown Body:</label>
                <textarea
                  rows={18}
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="inp font-mono text-xs leading-relaxed p-3.5 w-full bg-[#05070f]"
                />
              </div>
            </div>
          ) : (
            /* Live Viewer Mode */
            <div className="space-y-4">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(148,163,255,0.1)] pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] kick">{activePage.category}</span>
                    <span className="text-[10px] font-mono text-[#8FA0C2]">/ {activePage.slug}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#E9EDF8] mt-0.5">{activePage.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activePage.content);
                      alert('Markdown content copied to clipboard!');
                    }}
                    className="btn btn-g text-xs px-2.5 py-1 text-[#8FA0C2] hover:text-[#E9EDF8]"
                    title="Copy raw markdown"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-p text-xs px-3 py-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    Edit Page
                  </button>
                </div>
              </div>

              {/* Page Metadata Tagline */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#8FA0C2] font-mono py-1.5 px-3 rounded-lg bg-[#0E1830] border border-[rgba(148,163,255,0.08)]">
                <span>Version: <strong className="text-[#22D3EE]">v{activePage.version}</strong></span>
                <span>•</span>
                <span>Last Updated: <strong className="text-[#E9EDF8]">{activePage.lastModified}</strong></span>
                <span>•</span>
                <span>Sign-off: <strong className="text-emerald-400">{activePage.author}</strong></span>
                <span>•</span>
                <span>Status: <strong className="text-emerald-400">RATIFIED (L0)</strong></span>
              </div>

              {/* Rendered Body */}
              <div className="py-2 space-y-1">
                {renderMarkdown(activePage.content)}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-4 border-t border-[rgba(148,163,255,0.08)] mt-6 flex items-center justify-between text-[10px] text-[#8FA0C2] font-mono">
            <span>Infinite Brain L0 Synced</span>
            <span>Protected by Non-Bypassable HITL Protocol</span>
          </div>
        </div>
      </div>

      {/* Add Page Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="panel max-w-xl w-full p-6 relative border border-[#22D3EE]/30 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#E9EDF8]">Create Dynamic Operational Page</h3>
            <p className="text-xs text-[#8FA0C2]">
              Add a new departmental SOP, executive playbook, or client-specific governance runbook.
            </p>

            <form onSubmit={handleAddPage} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Page Title:</label>
                <input
                  type="text"
                  required
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="e.g., Cape Town Edge Caching Architecture"
                  className="inp text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Category:</label>
                <select
                  value={newPageCategory}
                  onChange={(e) => setNewPageCategory(e.target.value)}
                  className="inp text-xs"
                >
                  <option value="Corporate Strategy">Corporate Strategy</option>
                  <option value="Product Development">Product Development</option>
                  <option value="Engineering & DevOps">Engineering &amp; DevOps</option>
                  <option value="Operations">Operations</option>
                  <option value="Governance & Security">Governance &amp; Security</option>
                  <option value="CRM & Sales">CRM &amp; Sales</option>
                  <option value="Finance & Accounting">Finance &amp; Accounting</option>
                  <option value="Custom Pages">Custom Pages</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Initial Content (Markdown):</label>
                <textarea
                  rows={6}
                  value={newPageContent}
                  onChange={(e) => setNewPageContent(e.target.value)}
                  className="inp font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-g text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-p text-xs px-4"
                >
                  Create Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
