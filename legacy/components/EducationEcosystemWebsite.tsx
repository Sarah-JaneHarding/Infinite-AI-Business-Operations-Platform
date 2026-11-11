import React, { useState, useEffect } from 'react';
import { 
  ZONES, 
  BOUNDARIES, 
  STRATA, 
  HABITAT_SURFACES, 
  ORGANISMS, 
  CRACKS, 
  LAWS4, 
  MOVES, 
  LEARNERS, 
  LE_LOOP, 
  STAGES_BUILD, 
  ROLES_LIST, 
  GLOSSARY, 
  TRUST_CARDS, 
  LAWS11, 
  INTELS, 
  COURSES 
} from '../data/educationEcosystemData';
import {
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Cpu,
  Layers,
  Users,
  Compass,
  FileCheck,
  GraduationCap,
  Calendar,
  Send,
  RotateCcw,
  Eye,
  Lock,
  GitPullRequest
} from 'lucide-react';

export type EcoChapter = 'home' | 'problem' | 'ecosystem' | 'how' | 'roles' | 'trust' | 'pd' | 'start';

interface Props {
  onSwitchToOps?: () => void;
}

export const EducationEcosystemWebsite: React.FC<Props> = ({ onSwitchToOps }) => {
  const [activeChapter, setActiveChapter] = useState<EcoChapter>('home');
  const [navHistory, setNavHistory] = useState<EcoChapter[]>([]);
  
  // Chapter 1 states
  const [openCrack, setOpenCrack] = useState<string | null>(null);

  // Chapter 2 states
  const [selectedZone, setSelectedZone] = useState<string>('roots');
  const [selectedBoundary, setSelectedBoundary] = useState<string | null>(null);
  const [selectedStrata, setSelectedStrata] = useState<string>('L0');
  const [selectedSurface, setSelectedSurface] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string>('MOD-01');

  // Chapter 3 states
  const [selectedLaw, setSelectedLaw] = useState<string | null>(null);
  const [selectedMove, setSelectedMove] = useState<number>(0);
  const [selectedLearner, setSelectedLearner] = useState<string>('Learner A');
  const [selectedLeLoop, setSelectedLeLoop] = useState<string>('signal');

  // Chapter 4 states
  const [selectedRole, setSelectedRole] = useState<string>('dbe');

  // Chapter 5 states
  const [selectedTrust, setSelectedTrust] = useState<string | null>(null);
  const [selectedLaw11, setSelectedLaw11] = useState<string | null>(null);
  const [selectedIntel, setSelectedIntel] = useState<string | null>(null);

  // Chapter 6 states
  const [openCourses, setOpenCourses] = useState<Record<number, boolean>>({});

  // Chapter 7 Form State
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    school: '',
    role: '',
    email: '',
    interest: 'Curriculum Engine (planning)',
    notes: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Navigation routing
  const navigateTo = (chapter: EcoChapter) => {
    if (chapter !== activeChapter) {
      setNavHistory(prev => [...prev, activeChapter]);
      setActiveChapter(chapter);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateBack = () => {
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory(h => h.slice(0, h.length - 1));
      setActiveChapter(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleCourse = (idx: number) => {
    setOpenCourses(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.school.trim() || !formData.email.trim() || !formData.role) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setFormError(null);
    setFormSubmitted(true);
  };

  const activeZoneObj = ZONES.find(z => z.id === selectedZone) || ZONES[0];
  const activeStrataObj = STRATA.find(s => s.id === selectedStrata) || STRATA[0];
  const activeOrgObj = ORGANISMS.find(o => o.id === selectedOrg) || ORGANISMS[0];
  const activeMoveObj = MOVES[selectedMove] || MOVES[0];
  const activeLearnerObj = LEARNERS.find(l => l.ref === selectedLearner) || LEARNERS[0];
  const activeLeObj = LE_LOOP.find(l => l.k === selectedLeLoop) || LE_LOOP[0];
  const activeRoleObj = ROLES_LIST.find(r => r.id === selectedRole) || ROLES_LIST[0];

  return (
    <div className="w-full bg-[#05070F] text-[#E9EDF8] min-h-screen relative font-sans">
      {/* Top Narrative Navigation */}
      <div className="sticky top-0 z-40 bg-[#05070F]/90 backdrop-blur-md border-b border-[rgba(148,163,255,0.16)] px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigateTo('home')}
              className="flex items-center gap-2 text-left focus:outline-none group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 via-cyan-400 to-emerald-400 flex items-center justify-center p-0.5 shadow-md shadow-violet-500/20">
                <div className="w-full h-full bg-[#05070F] rounded-[6px] flex items-center justify-center text-xs font-bold text-cyan-300">
                  ∞
                </div>
              </div>
              <div>
                <span className="font-bold text-sm tracking-wide text-white group-hover:text-cyan-300 transition-colors">
                  INFINITE-<span className="text-cyan-400">AI</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                  Education Ecosystem
                </span>
              </div>
            </button>

            {navHistory.length > 0 && (
              <button
                onClick={navigateBack}
                className="btn-s flex items-center gap-1 text-xs py-1 px-2.5 border-cyan-500/30 text-cyan-300 hover:text-white"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back</span>
              </button>
            )}
          </div>

          {/* Chapters Link Bar */}
          <div className="hidden md:flex items-center gap-1 text-xs">
            <button
              onClick={() => navigateTo('home')}
              className={`px-2.5 py-1 rounded-md transition-colors ${activeChapter === 'home' ? 'text-cyan-300 font-semibold bg-cyan-950/40' : 'text-[#CBD5E1] hover:text-white'}`}
            >
              Overview
            </button>
            <button
              onClick={() => navigateTo('problem')}
              className={`px-2.5 py-1 rounded-md transition-colors ${activeChapter === 'problem' ? 'text-cyan-300 font-semibold bg-cyan-950/40' : 'text-[#CBD5E1] hover:text-white'}`}
            >
              The Problem
            </button>
            <button
              onClick={() => navigateTo('ecosystem')}
              className={`px-2.5 py-1 rounded-md transition-colors ${activeChapter === 'ecosystem' ? 'text-cyan-300 font-semibold bg-cyan-950/40' : 'text-[#CBD5E1] hover:text-white'}`}
            >
              7 Habitats
            </button>
            <button
              onClick={() => navigateTo('how')}
              className={`px-2.5 py-1 rounded-md transition-colors ${activeChapter === 'how' ? 'text-cyan-300 font-semibold bg-cyan-950/40' : 'text-[#CBD5E1] hover:text-white'}`}
            >
              How It Works
            </button>
            <button
              onClick={() => navigateTo('roles')}
              className={`px-2.5 py-1 rounded-md transition-colors ${activeChapter === 'roles' ? 'text-cyan-300 font-semibold bg-cyan-950/40' : 'text-[#CBD5E1] hover:text-white'}`}
            >
              Who It's For
            </button>
            <button
              onClick={() => navigateTo('trust')}
              className={`px-2.5 py-1 rounded-md transition-colors ${activeChapter === 'trust' ? 'text-cyan-300 font-semibold bg-cyan-950/40' : 'text-[#CBD5E1] hover:text-white'}`}
            >
              Trust & Laws
            </button>
            <button
              onClick={() => navigateTo('pd')}
              className={`px-2.5 py-1 rounded-md transition-colors ${activeChapter === 'pd' ? 'text-cyan-300 font-semibold bg-cyan-950/40' : 'text-[#CBD5E1] hover:text-white'}`}
            >
              PD Courses
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Sarah-JaneHarding/infinite-ai-ecosystem"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-g text-xs py-1 px-3 flex items-center gap-1.5 text-[#CBD5E1] hover:text-white border-[rgba(148,163,255,0.2)]"
            >
              <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline font-mono">GitHub Repo</span>
            </a>

            <button
              onClick={() => navigateTo('start')}
              className="btn btn-p text-xs py-1 px-3.5 flex items-center gap-1"
            >
              <span>Start Pilot</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            {onSwitchToOps && (
              <button
                onClick={onSwitchToOps}
                className="btn-s text-xs py-1 px-2.5 text-amber-300 border-amber-500/30 hover:bg-amber-950/30"
                title="Switch to Internal Executive Ops"
              >
                Ops Suite
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Narrative Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* ================= CHAPTER: HOME ================= */}
        {activeChapter === 'home' && (
          <div className="space-y-16 animate-fadeIn">
            {/* Hero Section */}
            <div className="relative rounded-2xl overflow-hidden border border-[rgba(148,163,255,0.2)] bg-gradient-to-b from-[#0C1224] via-[#080D1D] to-[#05070F] p-6 sm:p-12 shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,92,255,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(45,212,191,0.12),transparent_50%)] pointer-events-none" />
              
              <div className="relative z-10 max-w-4xl space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>INFINITE-AI · Brain-Powered Education Ecosystem</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                  Every school is an ecosystem.{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                    We built the one that was missing.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-[#CBD5E1] leading-relaxed max-w-2xl">
                  INFINITE-AI is not another app for teachers to learn. It's the living system underneath the school day — the soil that holds your curriculum, the roots that remember every learner, and the quiet discipline that ensures a machine never makes a decision that belongs to a human.
                </p>

                {/* Core Affirmations */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="chip border-amber-500/30 bg-amber-950/30 text-amber-300 font-semibold">AI drafts</span>
                  <span className="chip border-cyan-500/30 bg-cyan-950/30 text-cyan-300 font-semibold">The teacher decides</span>
                  <span className="chip border-emerald-500/30 bg-emerald-950/30 text-emerald-300 font-semibold">Always</span>
                  <span className="chip">🇿🇦 CAPS · ATP · SIAS grounded</span>
                  <span className="chip">🔐 POPIA-safe · af-south-1 residency</span>
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <button
                    onClick={() => navigateTo('problem')}
                    className="btn btn-p text-sm py-2.5 px-5 flex items-center gap-2 font-semibold shadow-lg shadow-cyan-500/20"
                  >
                    <span>Explore The Narrative Storyline</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => navigateTo('ecosystem')}
                    className="btn btn-g text-sm py-2.5 px-5 flex items-center gap-2"
                  >
                    <span>Tour The 7 Habitats</span>
                    <Layers className="w-4 h-4 text-cyan-400" />
                  </button>

                  <a
                    href="https://github.com/Sarah-JaneHarding/infinite-ai-ecosystem"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-g text-sm py-2.5 px-4 flex items-center gap-1.5 text-emerald-300 hover:text-white border-emerald-500/30 font-mono"
                  >
                    <span>Source on GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Telemetry Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 border-t border-[rgba(148,163,255,0.12)]">
                  <div className="panel2 p-3 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">7</p>
                    <p className="text-[11px] text-[#CBD5E1] mt-0.5">Living Habitats</p>
                  </div>
                  <div className="panel2 p-3 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-400">46</p>
                    <p className="text-[11px] text-[#CBD5E1] mt-0.5">Specialist Agents</p>
                  </div>
                  <div className="panel2 p-3 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-amber-400">4</p>
                    <p className="text-[11px] text-[#CBD5E1] mt-0.5">Unbreakable Laws</p>
                  </div>
                  <div className="panel2 p-3 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-cyan-400">19</p>
                    <p className="text-[11px] text-[#CBD5E1] mt-0.5">Gated Build Seasons</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chapters Grid */}
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <p className="kick text-cyan-400">The Story, In Six Chapters</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Follow the water. <span className="grad">Meet the whole system.</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#CBD5E1]">
                  A platform is something you log into. An ecosystem is something you live inside — and it gets healthier the longer the school tends it.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div 
                  onClick={() => navigateTo('problem')}
                  className="panel p-6 cursor-pointer hover:-translate-y-1 transition-transform border-[rgba(148,163,255,0.16)] hover:border-amber-500/50 group"
                >
                  <p className="kick text-amber-400">Chapter 01</p>
                  <h3 className="font-bold text-lg text-white mt-1 group-hover:text-amber-300">🌵 The Problem, In Plain Terms</h3>
                  <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">
                    Four cracks run through almost every school, rich or under-resourced — and buckets won't fix them. You fix the soil.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-amber-400 font-semibold">
                    <span>The dry season</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div 
                  onClick={() => navigateTo('ecosystem')}
                  className="panel p-6 cursor-pointer hover:-translate-y-1 transition-transform border-[rgba(148,163,255,0.16)] hover:border-emerald-500/50 group"
                >
                  <p className="kick text-emerald-400">Chapter 02</p>
                  <h3 className="font-bold text-lg text-white mt-1 group-hover:text-emerald-300">🌍 The Product, As An Ecosystem</h3>
                  <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">
                    Seven habitats: Root Network, Growing Season, Watering Hole, Watershed, Workshop Grove, Nesting Ground, and Seasons.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                    <span>Walk the landscape</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div 
                  onClick={() => navigateTo('how')}
                  className="panel p-6 cursor-pointer hover:-translate-y-1 transition-transform border-[rgba(148,163,255,0.16)] hover:border-cyan-500/50 group"
                >
                  <p className="kick text-cyan-400">Chapter 03</p>
                  <h3 className="font-bold text-lg text-white mt-1 group-hover:text-cyan-300">⚖️ How We Solve It</h3>
                  <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">
                    Four laws written into code, not the brochure — then a full term inside the system with real-time student simulations.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-cyan-400 font-semibold">
                    <span>A term inside</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div 
                  onClick={() => navigateTo('roles')}
                  className="panel p-6 cursor-pointer hover:-translate-y-1 transition-transform border-[rgba(148,163,255,0.16)] hover:border-violet-500/50 group"
                >
                  <p className="kick text-violet-400">Chapter 04</p>
                  <h3 className="font-bold text-lg text-white mt-1 group-hover:text-violet-300">🧑‍🤝‍🧑 Who It's For</h3>
                  <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">
                    The same ecosystem, distinct views: DBE and district, SMT, HoD, teachers, SBST, and families.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-violet-400 font-semibold">
                    <span>Find your habitat</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div 
                  onClick={() => navigateTo('trust')}
                  className="panel p-6 cursor-pointer hover:-translate-y-1 transition-transform border-[rgba(148,163,255,0.16)] hover:border-rose-500/50 group"
                >
                  <p className="kick text-rose-400">Chapter 05</p>
                  <h3 className="font-bold text-lg text-white mt-1 group-hover:text-rose-300">🛡 Trust, Made Visible</h3>
                  <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">
                    Residency, consent, human oversight, auditability — an ecosystem you can inspect, verify, and mathematically audit.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-rose-400 font-semibold">
                    <span>See the proof</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div 
                  onClick={() => navigateTo('pd')}
                  className="panel p-6 cursor-pointer hover:-translate-y-1 transition-transform border-[rgba(148,163,255,0.16)] hover:border-amber-500/50 group"
                >
                  <p className="kick text-amber-400">Chapter 06</p>
                  <h3 className="font-bold text-lg text-white mt-1 group-hover:text-amber-300">🎓 Grow the People</h3>
                  <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">
                    Four professional development courses with tangible teacher deliverables, aligned with SACE CPTD requirements.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-amber-400 font-semibold">
                    <span>The PD series</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Seven Habitats Grid */}
            <div className="panel p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="kick text-cyan-400">Habitat Architecture</p>
                  <h3 className="text-xl font-bold text-white">Seven habitats, one continuous ground</h3>
                </div>
                <button
                  onClick={() => navigateTo('ecosystem')}
                  className="btn btn-p text-xs py-1.5 px-3 self-start sm:self-auto"
                >
                  Inspect Full Topology →
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {ZONES.map(z => (
                  <div 
                    key={z.id}
                    onClick={() => {
                      setSelectedZone(z.id);
                      navigateTo('ecosystem');
                    }}
                    className="panel2 p-4 cursor-pointer hover:border-cyan-400/50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{z.icon}</span>
                      <span className="chip text-[10px] py-0 px-2 font-mono" style={{ color: z.hue }}>{z.tag}</span>
                    </div>
                    <p className="font-bold text-[#E9EDF8] text-sm pt-1">{z.name}</p>
                    <p className="text-[#CBD5E1] text-[11px] leading-relaxed">{z.meta}</p>
                  </div>
                ))}
                
                <div 
                  onClick={() => navigateTo('how')}
                  className="panel2 p-4 cursor-pointer hover:border-amber-400/50 transition-colors border-amber-500/30 bg-amber-950/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">⚖️</span>
                    <span className="chip text-[10px] py-0 px-2 font-mono text-amber-400 border-amber-500/30">Laws</span>
                  </div>
                  <p className="font-bold text-amber-300 text-sm pt-1">Four Unbreakable Laws</p>
                  <p className="text-[#CBD5E1] text-[11px] leading-relaxed">
                    The software cannot break them — human apex governance written directly into code.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CHAPTER 1: THE PROBLEM ================= */}
        {activeChapter === 'problem' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <p className="kick text-amber-400">Chapter 01 · The Problem, In Plain Terms</p>
              <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
                South African classrooms aren't short on effort.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-amber-200">
                  They're short on soil.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
                Ask any Head of Department what's hardest about their job and it's rarely teaching itself. It's everything that's supposed to hold teaching up — and quietly doesn't. Four cracks run through almost every school, rich or under-resourced. Click a crack to uncover how the ecosystem resolves it.
              </p>
            </div>

            {/* The 4 Cracks Interactive Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {CRACKS.map(crack => (
                <div
                  key={crack.n}
                  onClick={() => setOpenCrack(openCrack === crack.n ? null : crack.n)}
                  className={`panel p-6 cursor-pointer transition-all ${openCrack === crack.n ? 'border-amber-400 bg-[#0E1B38]' : 'hover:border-amber-500/40'}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl font-mono font-bold text-amber-400/60">{crack.n}</span>
                    <span className="text-xs text-cyan-400 font-mono">
                      {openCrack === crack.n ? 'Collapse ▲' : 'Tap for answer ▼'}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-white mt-2">{crack.t}</h3>
                  <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">{crack.d}</p>

                  {openCrack === crack.n && (
                    <div className="mt-4 pt-3 border-t border-amber-500/30 text-xs text-emerald-300 bg-emerald-950/20 p-3 rounded-lg animate-fadeIn">
                      <span className="font-bold text-emerald-400 block mb-1">🌿 How the ecosystem fixes this:</span>
                      {crack.eco}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Design Principle Callout */}
            <div className="panel p-8 text-center border-amber-500/30 bg-[#0C152B]">
              <p className="text-xl sm:text-2xl font-serif italic text-amber-300 max-w-2xl mx-auto">
                "You don't fix a drought by handing out buckets. You fix the soil, so water finds its own way to every root."
              </p>
              <p className="text-xs text-[#CBD5E1] mt-3 uppercase tracking-widest font-mono">
                — The core engineering principle behind Infinite-AI
              </p>
            </div>

            {/* Buckets vs Ground Comparison */}
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <p className="kick text-emerald-400">Buckets vs Ground</p>
                <h2 className="text-2xl sm:text-4xl font-bold leading-tight">
                  Most EdTech is buckets.<br />
                  <span className="text-emerald-400">Infinite-AI is ground.</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                  Most EdTech tools are buckets: one app for lesson plans, another for tracking, another for worksheets — each one useful for a fleeting moment, none talking to each other, all adding one more login for an exhausted educator.
                </p>
                <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                  Infinite-AI was built from the opposite principle. Everything a school runs on — CAPS, the DBE Annual Teaching Plans, the school’s own verified templates, the way the staffroom speaks — is planted into one shared root foundation first. Every tool grows from that same soil, so nothing is duplicated or contradicted.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => navigateTo('ecosystem')}
                    className="btn btn-p text-xs py-2 px-4"
                  >
                    <span>Tour The Habitats →</span>
                  </button>
                </div>
              </div>

              <div className="panel p-6 border-cyan-500/30 bg-[#091428] space-y-4 text-xs">
                <p className="font-bold text-sm text-cyan-300">Why An Ecosystem, Not A "Platform"?</p>
                <div className="space-y-3 text-[#CBD5E1]">
                  <div className="p-3 rounded-lg bg-[#060D1A] border border-[rgba(148,163,255,0.1)]">
                    <strong className="text-white block mb-1">A Platform:</strong>
                    A set of disjointed tools you log into and leave behind. If you stop using it for a week, you lose no compounding memory.
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200">
                    <strong className="text-emerald-400 block mb-1">An Ecosystem:</strong>
                    A living habitat that gets healthier the longer the school tends it. Every teacher correction refines the school's private memory, while students are supported before they slip through the cracks.
                  </div>
                </div>
              </div>
            </div>

            {/* The Honest Weather - PIRLS 2021 Data */}
            <div className="space-y-6 pt-4">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <p className="kick text-amber-400">The Evidence Behind The Urgency</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Honest weather, <span className="text-amber-400">honestly named.</span>
                </h2>
                <p className="text-xs text-[#CBD5E1]">
                  This is the climate the ecosystem was grown for — and why it was grown <em className="text-white">in</em> South Africa, not adapted from elsewhere.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="panel2 p-4 text-center border-amber-500/20">
                  <p className="text-3xl font-bold text-amber-400 font-mono">81%</p>
                  <p className="text-[11px] text-[#CBD5E1] mt-1">SA Grade 4 learners cannot read for meaning in any language (PIRLS 2021)</p>
                </div>
                <div className="panel2 p-4 text-center border-amber-500/20">
                  <p className="text-3xl font-bold text-amber-400 font-mono">288</p>
                  <p className="text-[11px] text-[#CBD5E1] mt-1">SA mean PIRLS score vs international average of 500</p>
                </div>
                <div className="panel2 p-4 text-center border-amber-500/20">
                  <p className="text-3xl font-bold text-amber-400 font-mono">57th</p>
                  <p className="text-[11px] text-[#CBD5E1] mt-1">Last of 57 nations — 32 pt drop = half a year lost learning</p>
                </div>
                <div className="panel2 p-4 text-center border-amber-500/20">
                  <p className="text-3xl font-bold text-amber-400 font-mono">&lt;50%</p>
                  <p className="text-[11px] text-[#CBD5E1] mt-1">Grade 1 no-fee learners know the alphabet by year-end</p>
                </div>
              </div>

              <div className="panel p-6 border-cyan-500/20 bg-[#081224] flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-[#CBD5E1] max-w-2xl">
                  No teacher is failing here. The scale is failing the teacher. One educator facing thirty-plus learners cannot individually coach oral reading fluency every day without a living support network.
                </p>
                <button
                  onClick={() => navigateTo('ecosystem')}
                  className="btn btn-p text-xs py-2 px-4 shrink-0 font-semibold"
                >
                  Enter The Ecosystem →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= CHAPTER 2: THE ECOSYSTEM ================= */}
        {activeChapter === 'ecosystem' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <p className="kick text-emerald-400">Chapter 02 · The Product, As An Ecosystem</p>
              <h1 className="text-3xl sm:text-5xl font-bold">
                Seven habitats. <span className="grad">One living system.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#CBD5E1]">
                Each module of Infinite-AI maps directly to an organic habitat. Click any habitat to explore its pipeline, purpose, and human gates.
              </p>
            </div>

            {/* Zone Selector and Detail Display */}
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* Left: Zone Cards */}
              <div className="lg:col-span-5 space-y-2">
                {ZONES.map(z => (
                  <div
                    key={z.id}
                    onClick={() => setSelectedZone(z.id)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border ${selectedZone === z.id ? 'border-cyan-400 bg-cyan-950/20 shadow-md shadow-cyan-500/10' : 'border-[rgba(148,163,255,0.12)] bg-[#0C1428] hover:border-cyan-500/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{z.icon}</span>
                        <span className="font-semibold text-xs text-[#E9EDF8]">{z.name.split('·')[0]}</span>
                      </div>
                      <span className="chip text-[10px] font-mono py-0 px-2" style={{ color: z.hue }}>{z.tag}</span>
                    </div>
                    <p className="text-[11px] text-[#CBD5E1] mt-1 line-clamp-1">{z.meta}</p>
                  </div>
                ))}
              </div>

              {/* Right: Active Zone Details */}
              <div className="lg:col-span-7 panel p-6 sm:p-8 space-y-5 border-cyan-500/30 bg-[#0A152A]">
                <div className="flex items-center justify-between border-b border-[rgba(148,163,255,0.14)] pb-4">
                  <div>
                    <span className="chip text-[10px] font-mono mb-1" style={{ color: activeZoneObj.hue }}>
                      {activeZoneObj.tag} · {activeZoneObj.meta.toUpperCase()}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                      <span>{activeZoneObj.icon}</span>
                      <span>{activeZoneObj.name}</span>
                    </h2>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                  {activeZoneObj.plain}
                </p>

                {activeZoneObj.why ? (
                  <div className="panel2 p-3 text-xs text-amber-300 border-amber-500/30 bg-amber-950/20">
                    <strong className="block text-amber-400 font-semibold mb-0.5">✦ Architectural Guarantee:</strong>
                    {activeZoneObj.why}
                  </div>
                ) : (
                  <div className="panel2 p-3 text-xs text-cyan-300 border-cyan-500/30 bg-cyan-950/20">
                    <strong className="block text-cyan-400 font-semibold mb-0.5">👥 Primary Beneficiaries:</strong>
                    {activeZoneObj.who}
                  </div>
                )}

                {/* Pipeline */}
                <div className="space-y-2 pt-2">
                  <p className="kick text-cyan-400 text-[10px]">Processing Pipeline Flow</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeZoneObj.pipe.map((step, idx) => {
                      const isGate = step.includes('◆');
                      return (
                        <span
                          key={idx}
                          className={`chip text-[11px] font-mono py-1 px-2.5 ${isGate ? 'border-amber-500/50 bg-amber-950/40 text-amber-300 font-bold' : 'bg-[#060D1A]'}`}
                        >
                          {step}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* The Boundaries */}
            <div className="space-y-4 pt-4">
              <div className="text-center max-w-2xl mx-auto space-y-1">
                <p className="kick text-rose-400">Boundaries & Perimeter</p>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Every reserve needs fences, gates, and climate</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {BOUNDARIES.map(b => (
                  <div 
                    key={b.name}
                    onClick={() => setSelectedBoundary(selectedBoundary === b.name ? null : b.name)}
                    className="panel p-5 cursor-pointer hover:border-cyan-400/50 transition-colors space-y-2 text-xs"
                  >
                    <div className="text-2xl">{b.icon}</div>
                    <h3 className="font-bold text-sm text-white">{b.name}</h3>
                    <p className="text-[#CBD5E1] leading-relaxed">{b.d}</p>
                    <div className="pt-2 border-t border-[rgba(148,163,255,0.1)] text-[11px]" style={{ color: b.hue }}>
                      💡 {b.say}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inside The Root Network · Strata L0-L4 */}
            <div className="panel p-6 sm:p-8 space-y-6 border-violet-500/30 bg-[#0B142B]">
              <div className="space-y-2">
                <p className="kick text-amber-400">Inside The Root Network · L0–L4 Strata</p>
                <h2 className="text-2xl font-bold text-white">The soil, in five immutable strata</h2>
                <p className="text-xs text-[#CBD5E1] max-w-3xl">
                  Like tree rings and deep bedrock, the Infinite Brain stores non-negotiable curriculum truths, temporal history, and procedural exemplars. Click a layer to inspect its storage mechanism:
                </p>
              </div>

              <div className="grid sm:grid-cols-5 gap-2">
                {STRATA.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStrata(s.id)}
                    className={`p-3 rounded-lg text-left transition-all border ${selectedStrata === s.id ? 'border-amber-400 bg-amber-950/30 text-white' : 'border-[rgba(148,163,255,0.12)] bg-[#070E1E] text-[#CBD5E1] hover:border-amber-500/30'}`}
                  >
                    <span className="font-mono font-bold text-sm block" style={{ color: s.hue }}>{s.id}</span>
                    <span className="text-[11px] font-medium block mt-0.5">{s.name.split('·')[0]}</span>
                  </button>
                ))}
              </div>

              {/* Active Stratum Card */}
              <div className="panel2 p-5 border-amber-500/30 bg-[#071020] space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(148,163,255,0.12)] pb-2.5">
                  <h3 className="font-bold text-base text-white" style={{ color: activeStrataObj.hue }}>
                    {activeStrataObj.name}
                  </h3>
                  <div className="flex gap-1.5">
                    {activeStrataObj.badges.map((b, i) => (
                      <span key={i} className="chip text-[10px] py-0 px-2">{b}</span>
                    ))}
                  </div>
                </div>

                <p className="text-[#CBD5E1] leading-relaxed text-xs sm:text-sm">{activeStrataObj.desc}</p>
                <div className="p-2.5 rounded-lg bg-[#040812] border border-cyan-500/30 text-cyan-300 font-mono text-[11px]">
                  <strong>Real example:</strong> {activeStrataObj.ex}
                </div>
              </div>

              {/* Brain API Callouts */}
              <div className="pt-2 border-t border-[rgba(148,163,255,0.12)] space-y-2">
                <p className="kick text-[10px] text-cyan-400">The Brain API: How The Soil Is Queried</p>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="chip border-cyan-500/30 text-cyan-300">remember()</span>
                  <span className="chip border-cyan-500/30 text-cyan-300">recall()</span>
                  <span className="chip border-cyan-500/30 text-cyan-300">ratify()</span>
                  <span className="chip border-cyan-500/30 text-cyan-300">supersede()</span>
                  <span className="chip border-cyan-500/30 text-cyan-300">forget()</span>
                  <span className="chip border-amber-500/40 text-amber-300 font-bold">explain() ➜ Full Provenance Chain</span>
                </div>
              </div>
            </div>

            {/* 46 Specialist Agents */}
            <div className="space-y-4 pt-4">
              <div className="text-center max-w-2xl mx-auto space-y-1">
                <p className="kick text-cyan-400">Specialist Organisms</p>
                <h2 className="text-2xl font-bold text-white">46 specialist agents, each with one niche</h2>
                <p className="text-xs text-[#CBD5E1]">Registered, eval-gated (≥20 test cases), budget-capped, and human-supervised.</p>
              </div>

              <div className="grid sm:grid-cols-5 gap-2">
                {ORGANISMS.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrg(o.id)}
                    className={`p-3 rounded-lg text-center transition-all border ${selectedOrg === o.id ? 'border-cyan-400 bg-cyan-950/30 text-white' : 'border-[rgba(148,163,255,0.12)] bg-[#070F22] text-[#CBD5E1] hover:border-cyan-500/30'}`}
                  >
                    <span className="text-xl block">{o.icon}</span>
                    <span className="font-mono font-bold text-xs block mt-1">{o.id}</span>
                    <span className="text-[10px] text-amber-400 block">{o.count} species</span>
                  </button>
                ))}
              </div>

              {/* Selected Module Agent Roster */}
              <div className="panel p-5 border-cyan-500/30 bg-[#081326] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{activeOrgObj.icon}</span>
                    <span>{activeOrgObj.id} · {activeOrgObj.name}</span>
                  </h3>
                  <span className="chip text-cyan-300 font-mono text-[10px]">{activeOrgObj.count} Agents</span>
                </div>

                <div className="grid sm:grid-cols-3 gap-2 text-xs">
                  {activeOrgObj.agents.map(([code, name]) => (
                    <div key={code} className="panel2 p-2.5 flex items-center justify-between font-mono text-[11px]">
                      <span className="text-amber-400 font-semibold">{code}</span>
                      <span className="text-[#E9EDF8] font-sans">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CHAPTER 3: HOW WE SOLVE IT ================= */}
        {activeChapter === 'how' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <p className="kick text-cyan-400">Chapter 03 · How We Solve It</p>
              <h1 className="text-3xl sm:text-5xl font-bold">
                Every ecosystem runs on laws <span className="grad">that can't be broken.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#CBD5E1]">
                Ours has four. These are not marketing slogans — they are cryptographic assertions written directly into code. Ask the system to show its work, and it will.
              </p>
            </div>

            {/* Four Unbreakable Laws */}
            <div className="grid md:grid-cols-2 gap-4">
              {LAWS4.map(law => (
                <div
                  key={law.n}
                  onClick={() => setSelectedLaw(selectedLaw === law.n ? null : law.n)}
                  className={`panel p-6 cursor-pointer border-l-4 border-l-emerald-400 transition-all ${selectedLaw === law.n ? 'border-cyan-400 bg-[#0E1A36]' : 'hover:border-cyan-500/40'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs kick text-emerald-400">{law.n} · {law.t}</p>
                    <span className="text-xs text-cyan-400 font-mono">
                      {selectedLaw === law.n ? 'Hide Tech Gate ▲' : 'Tech Gate ▼'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-white mt-1.5 flex items-center gap-2">
                    <span>{law.icon}</span>
                    <span>{law.h}</span>
                  </h3>
                  <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">{law.d}</p>

                  {selectedLaw === law.n && (
                    <div className="mt-4 pt-3 border-t border-[rgba(148,163,255,0.14)] text-xs text-cyan-300 font-mono bg-[#060D1A] p-3 rounded-lg animate-fadeIn">
                      <strong className="text-cyan-400 block mb-1">⚙️ Enforcement in Code:</strong>
                      {law.tech}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Five Movements of a Term */}
            <div className="panel p-6 sm:p-8 space-y-6 border-cyan-500/30 bg-[#091428]">
              <div className="space-y-1 text-center max-w-2xl mx-auto">
                <p className="kick text-cyan-400">One Term Inside The System</p>
                <h2 className="text-2xl font-bold text-white">Five harmonious movements</h2>
                <p className="text-xs text-[#CBD5E1]">From Monday's lesson preparation to Friday's SBST case conference.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {MOVES.map((m, idx) => (
                  <button
                    key={m.short}
                    onClick={() => setSelectedMove(idx)}
                    className={`p-3 rounded-xl text-center transition-all border ${selectedMove === idx ? 'border-cyan-400 bg-cyan-950/40 text-white shadow-md' : 'border-[rgba(148,163,255,0.12)] bg-[#060E1E] text-[#CBD5E1] hover:border-cyan-500/30'}`}
                  >
                    <span className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center mx-auto mb-1.5 font-mono">
                      {m.short}
                    </span>
                    <span className="text-xs font-semibold block">{m.name.split('·')[0]}</span>
                  </button>
                ))}
              </div>

              <div className="panel2 p-5 border-cyan-500/30 bg-[#050D1A] space-y-3 text-xs">
                <h3 className="text-base font-bold text-white" style={{ color: activeMoveObj.hue }}>
                  {activeMoveObj.name}
                </h3>
                <p className="text-[#CBD5E1] leading-relaxed text-xs sm:text-sm">{activeMoveObj.d}</p>
                <div className="p-3 rounded-lg bg-[#03070E] border border-[rgba(148,163,255,0.12)] text-[#E9EDF8] font-mono text-[11px]">
                  {activeMoveObj.ex}
                </div>
              </div>
            </div>

            {/* Interactive Learner Simulator in the Watering Hole */}
            <div className="panel p-6 sm:p-8 space-y-6 border-amber-500/30 bg-[#0C152C]">
              <div className="space-y-2 text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Interactive Live Simulator</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  A term inside <span className="text-amber-400">The Watering Hole</span>
                </h2>
                <p className="text-xs text-[#CBD5E1]">
                  Select an anonymized student profile to observe how data sufficiency, whole-class core health checks, and mandatory human ratification gates function in real time:
                </p>
              </div>

              <div className="grid sm:grid-cols-4 gap-2">
                {LEARNERS.map(l => (
                  <button
                    key={l.ref}
                    onClick={() => setSelectedLearner(l.ref)}
                    className={`p-3 rounded-lg text-left transition-all border ${selectedLearner === l.ref ? 'border-amber-400 bg-amber-950/30 text-white' : 'border-[rgba(148,163,255,0.12)] bg-[#070F22] text-[#CBD5E1] hover:border-amber-500/30'}`}
                  >
                    <span className="font-bold text-sm block" style={{ color: l.hue }}>{l.ref}</span>
                    <span className="text-[11px] text-[#CBD5E1] block mt-0.5">{l.ctx}</span>
                  </button>
                ))}
              </div>

              {/* Simulation Result Output */}
              <div className="grid lg:grid-cols-3 gap-4 text-xs">
                {/* Signals In */}
                <div className="panel2 p-4 bg-[#050B17] space-y-2">
                  <p className="kick text-[10px] text-rose-400">Signals In (De-identified)</p>
                  <ul className="space-y-1.5">
                    {activeLearnerObj.pts.map((p, i) => (
                      <li key={i} className="p-2 rounded bg-[#091325] border border-[rgba(148,163,255,0.08)] text-[11px]">
                        📥 {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gate Checks */}
                <div className="panel2 p-4 bg-[#050B17] space-y-2">
                  <p className="kick text-[10px] text-cyan-400">Automated Gate Checks</p>
                  <div className={`p-2.5 rounded border text-[11px] ${activeLearnerObj.core.ok ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300' : 'border-amber-500/30 bg-amber-950/20 text-amber-300'}`}>
                    🏫 {activeLearnerObj.core.txt}
                  </div>
                  <div className="p-2.5 rounded border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 text-[11px]">
                    📊 {activeLearnerObj.suff ? 'Data sufficiency threshold passed (≥5 pts).' : 'Insufficient data points — recommendation suppressed.'}
                  </div>
                </div>

                {/* Outcome & Human Gate */}
                <div className="panel2 p-4 bg-[#050B17] space-y-2 border-amber-500/30">
                  <p className="kick text-[10px] text-amber-400">Outcome & Human Ratification</p>
                  <div className="p-2.5 rounded bg-[#0A162B] border font-mono font-bold text-xs" style={{ borderColor: activeLearnerObj.hue, color: activeLearnerObj.hue }}>
                    {activeLearnerObj.tier}
                  </div>
                  <p className="text-[11px] text-[#CBD5E1] leading-relaxed">{activeLearnerObj.plan}</p>
                  <div className="pt-1 text-[11px] text-amber-300 font-medium">
                    🧑‍🏫 {activeLearnerObj.gate}
                  </div>
                  <p className="text-[10px] text-[#CBD5E1]">🗓 Review timeline: {activeLearnerObj.review}</p>
                </div>
              </div>
            </div>

            {/* Build Seasons 00 to 18 */}
            <div className="panel p-6 space-y-4 border-cyan-500/20 bg-[#081224]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="kick text-cyan-400">How It Was Grown</p>
                  <h3 className="font-bold text-lg text-white">Nineteen build seasons (00 to 18)</h3>
                  <p className="text-xs text-[#CBD5E1]">No season begins until the previous season's exit gate passes.</p>
                </div>
                <span className="chip text-emerald-300 border-emerald-500/30 bg-emerald-950/40 text-[11px]">
                  All Gates Verified
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 pt-1 font-mono text-xs">
                {STAGES_BUILD.map(([num, name, dep]) => (
                  <div 
                    key={num} 
                    className="p-3 rounded-lg bg-[#050B18] border border-[rgba(148,163,255,0.12)] shrink-0 w-52 space-y-1"
                  >
                    <span className="text-cyan-400 font-bold text-sm block">Season {num}</span>
                    <p className="text-[11px] text-[#E9EDF8] font-sans font-medium line-clamp-2">{name}</p>
                    <p className="text-[10px] text-[#CBD5E1]">Dep: {dep}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= CHAPTER 4: WHO IT'S FOR ================= */}
        {activeChapter === 'roles' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <p className="kick text-violet-400">Chapter 04 · Who It's For</p>
              <h1 className="text-3xl sm:text-5xl font-bold">
                The same ecosystem, <span className="grad">different views.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#CBD5E1]">
                Nobody sees the whole machine. Everyone sees what their role needs — and nothing more.
              </p>
            </div>

            {/* Role Selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {ROLES_LIST.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`p-3 rounded-xl text-center transition-all border ${selectedRole === r.id ? 'border-amber-400 bg-amber-950/40 text-white shadow-md' : 'border-[rgba(148,163,255,0.12)] bg-[#070F22] text-[#CBD5E1] hover:border-amber-500/30'}`}
                >
                  <span className="text-2xl block mb-1">{r.icon}</span>
                  <span className="text-xs font-semibold block">{r.name}</span>
                </button>
              ))}
            </div>

            {/* Active Role Deep Dive */}
            <div className="panel p-6 sm:p-8 space-y-6 border-amber-500/30 bg-[#0B152B]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(148,163,255,0.12)] pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span>{activeRoleObj.icon}</span>
                    <span>{activeRoleObj.name}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-cyan-300 mt-1">{activeRoleObj.pitch}</p>
                </div>
                <span className="chip text-amber-300 border-amber-500/40 bg-amber-950/30 text-xs">
                  {activeRoleObj.habitat}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-xs">
                {/* Key Benefits */}
                <div className="space-y-3">
                  <p className="kick text-cyan-400">What Changes In Practice</p>
                  <ul className="space-y-2">
                    {activeRoleObj.points.map((pt, i) => (
                      <li key={i} className="panel2 p-3 text-[#E9EDF8] leading-relaxed flex items-start gap-2">
                        <span className="text-emerald-400 shrink-0">🌿</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Before vs After */}
                <div className="space-y-3">
                  <p className="kick text-amber-400">Before & After</p>
                  <div className="panel2 p-3.5 border-rose-500/30 bg-rose-950/10 text-rose-300 space-y-1">
                    <strong className="block font-semibold">🌵 Before Infinite-AI:</strong>
                    <p className="text-xs leading-relaxed">{activeRoleObj.before}</p>
                  </div>
                  <div className="panel2 p-3.5 border-emerald-500/30 bg-emerald-950/20 text-emerald-300 space-y-1">
                    <strong className="block font-semibold">🌳 After Infinite-AI:</strong>
                    <p className="text-xs leading-relaxed">{activeRoleObj.after}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Glossary */}
            <div className="space-y-4 pt-4">
              <div className="text-center max-w-2xl mx-auto space-y-1">
                <p className="kick text-cyan-400">The Alphabet, Translated</p>
                <h3 className="text-xl font-bold text-white">No educational jargon left unexplained</h3>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {GLOSSARY.map(([term, def]) => (
                  <div key={term} className="panel2 p-3.5 bg-[#060D1A] space-y-1">
                    <span className="font-mono font-bold text-cyan-300 text-sm block">{term}</span>
                    <p className="text-[#CBD5E1] text-[11px] leading-relaxed">{def}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= CHAPTER 5: TRUST & LAWS ================= */}
        {activeChapter === 'trust' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <p className="kick text-rose-400">Chapter 05 · Trust, Made Visible</p>
              <h1 className="text-3xl sm:text-5xl font-bold">
                An ecosystem you can <span className="grad">inspect</span>, not just believe.
              </h1>
              <p className="text-xs sm:text-sm text-[#CBD5E1]">
                Residency, POPIA consent, non-bypassable human oversight, and cryptographic auditability.
              </p>
            </div>

            {/* Four Trust Pillars */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TRUST_CARDS.map(tc => (
                <div
                  key={tc.t}
                  onClick={() => setSelectedTrust(selectedTrust === tc.t ? null : tc.t)}
                  className={`panel p-6 cursor-pointer transition-all ${selectedTrust === tc.t ? 'border-cyan-400 bg-[#0E1A36]' : 'hover:border-cyan-500/40'}`}
                >
                  <span className="text-2xl">{tc.icon}</span>
                  <h3 className="font-bold text-base text-white mt-2">{tc.t}</h3>
                  <p className="text-xs text-cyan-400 mt-0.5">{tc.sub}</p>
                  <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">{tc.d}</p>

                  {selectedTrust === tc.t && (
                    <div className="mt-3 pt-3 border-t border-[rgba(148,163,255,0.12)] text-[11px] text-cyan-300 font-mono bg-[#050C16] p-2.5 rounded">
                      <strong>Under the hood:</strong> {tc.tech}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Human vs Machine Responsibility Division */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="panel p-6 border-violet-500/40 bg-[#0A1224] space-y-3 text-xs">
                <h3 className="font-bold text-base text-violet-300 flex items-center gap-2">
                  <span>⚙️</span>
                  <span>What The AI Takes On (Always as Drafts)</span>
                </h3>
                <ul className="space-y-2 text-[#CBD5E1]">
                  <li className="panel2 p-2.5">📋 Drafting lesson plans, units, and assessments aligned to CAPS & ATP</li>
                  <li className="panel2 p-2.5">🔊 Universal screening and weekly progress trend calculations</li>
                  <li className="panel2 p-2.5">💬 First-pass formative feedback grounded in teacher rubrics</li>
                  <li className="panel2 p-2.5">🎯 Targeted remediation sets matched to precise sub-skills</li>
                  <li className="panel2 p-2.5">📝 Assembling SBST meeting agendas, minutes, and SIAS support packs</li>
                </ul>
              </div>

              <div className="panel p-6 border-cyan-500/40 bg-[#08152A] space-y-3 text-xs">
                <h3 className="font-bold text-base text-cyan-300 flex items-center gap-2">
                  <span>🧑‍🏫</span>
                  <span>What Stays Human — Non-Bypassable Gates</span>
                </h3>
                <ul className="space-y-2 text-[#CBD5E1]">
                  <li className="panel2 p-2.5">❤️ Relationships, belonging, and the pastoral knowledge of a child</li>
                  <li className="panel2 p-2.5">🏛 Tier placements, support referrals, and exits — ratified by SBST</li>
                  <li className="panel2 p-2.5">🧠 Critical thinking: debating, questioning, ethical judgment</li>
                  <li className="panel2 p-2.5">🚨 Safeguarding alerts — immediate escalation to named humans, never queued</li>
                  <li className="panel2 p-2.5">✅ Final publication approval before any student or parent sees content</li>
                </ul>
              </div>
            </div>

            {/* Eleven Engineering Rules */}
            <div className="space-y-4 pt-4">
              <div className="text-center max-w-2xl mx-auto space-y-1">
                <p className="kick text-emerald-400">Engineering Rigour</p>
                <h3 className="text-xl font-bold text-white">Eleven engineering rules that never bend</h3>
                <p className="text-xs text-[#CBD5E1]">Enforced by CI tools and database triggers, not by optimistic trust.</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {LAWS11.map(([num, icon, title, desc, enforce]) => (
                  <div
                    key={num}
                    onClick={() => setSelectedLaw11(selectedLaw11 === num ? null : num)}
                    className="panel2 p-4 cursor-pointer hover:border-emerald-400/50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-emerald-400 font-bold">{num} {icon}</span>
                      <span className="text-[10px] text-cyan-400">{selectedLaw11 === num ? 'Hide ▲' : 'Enforce ▼'}</span>
                    </div>
                    <p className="font-bold text-white text-xs">"{title}"</p>
                    <p className="text-[#CBD5E1] text-[11px] leading-relaxed">{desc}</p>
                    {selectedLaw11 === num && (
                      <div className="pt-2 border-t border-[rgba(148,163,255,0.1)] text-[10px] font-mono text-cyan-300">
                        {enforce}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Multiple Intelligences */}
            <div className="panel p-6 sm:p-8 space-y-6 border-amber-500/20 bg-[#0C152B]">
              <div className="text-center max-w-2xl mx-auto space-y-1">
                <p className="kick text-amber-400">What The Saved Time Is For</p>
                <h3 className="text-xl font-bold text-white">Not one single metric. Eight ways to be brilliant.</h3>
                <p className="text-xs text-[#CBD5E1]">
                  Giving teachers their Sundays back unlocks space for every dimension of human intelligence:
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {INTELS.map(it => (
                  <div 
                    key={it.name}
                    className="panel2 p-4 bg-[#070F20] space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{it.icon}</span>
                      <div>
                        <span className="font-bold text-white block text-xs">{it.name}</span>
                        <span className="text-[9px] text-amber-400 uppercase tracking-widest font-mono">{it.sub}</span>
                      </div>
                    </div>
                    <p className="text-[#CBD5E1] text-[11px] leading-relaxed">{it.d}</p>
                    <div className="pt-1 text-[10px] text-cyan-300 font-mono">
                      ✦ {it.sup}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= CHAPTER 6: PD COURSES ================= */}
        {activeChapter === 'pd' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <p className="kick text-amber-400">Chapter 06 · Grow the People</p>
              <h1 className="text-3xl sm:text-5xl font-bold">
                Technology is half the story. <span className="grad">Teachers are the rest.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#CBD5E1]">
                A four-part professional development curriculum taking educators from their first prompt to whole-school, evidence-led AI governance. Self-paced with real deliverables for Monday morning.
              </p>
            </div>

            {/* Courses List */}
            <div className="space-y-4">
              {COURSES.map((course, idx) => {
                const isOpen = openCourses[idx];
                return (
                  <div key={course.part} className="panel p-6 border-[rgba(148,163,255,0.16)] bg-[#0A1428] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="kick text-[10px]" style={{ color: course.hue }}>{course.part}</span>
                        <h2 className="text-xl font-bold text-white">{course.title}</h2>
                        <p className="text-xs text-[#CBD5E1] max-w-2xl">{course.sub}</p>
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {course.chips.map((ch, i) => (
                            <span key={i} className="chip text-[10px] py-0.5 px-2">{ch}</span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => toggleCourse(idx)}
                        className="btn btn-g text-xs py-1.5 px-3 self-start sm:self-auto border-cyan-500/30 text-cyan-300"
                      >
                        {isOpen ? 'Collapse Modules ▲' : 'View Modules & Deliverables ▼'}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="pt-4 border-t border-[rgba(148,163,255,0.12)] grid md:grid-cols-2 gap-6 text-xs animate-fadeIn">
                        {/* Modules */}
                        <div className="space-y-2">
                          <p className="kick text-cyan-400 text-[10px]">Course Modules</p>
                          <ul className="space-y-1.5">
                            {course.mods.map((mod, mi) => (
                              <li key={mi} className="panel2 p-2 text-[#E9EDF8] font-mono text-[11px] flex items-center gap-2">
                                <span className="text-amber-400 font-bold">📍</span>
                                <span>{mod}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Deliverables */}
                        <div className="space-y-2">
                          <p className="kick text-emerald-400 text-[10px]">Real Deliverables Produced</p>
                          <ul className="space-y-1.5">
                            {course.del.map((del, di) => (
                              <li key={di} className="panel2 p-2 text-emerald-300 bg-emerald-950/20 border-emerald-500/20 text-[11px] flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{del}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <div className="pt-3">
                            <button
                              onClick={() => navigateTo('start')}
                              className="btn btn-p text-xs py-1.5 px-3.5"
                            >
                              Request Staff Enrolment →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SACE & POPIA Certification Note */}
            <div className="panel p-6 text-center border-amber-500/30 bg-[#0C162E] space-y-2">
              <p className="text-base font-bold text-white">Every Course Ends With Real Classroom Readiness 🎓</p>
              <p className="text-xs text-[#CBD5E1] max-w-xl mx-auto">
                CPTD points are calculated strictly against official SACE documentation, with human pastoral governance confirmed before any classroom deployment.
              </p>
            </div>
          </div>
        )}

        {/* ================= CHAPTER 7: START A CONVERSATION ================= */}
        {activeChapter === 'start' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Context & Phased Roadmap */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <p className="kick text-cyan-400">Ready When You Are</p>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mt-1">
                    Let's grow this ecosystem <span className="grad">in your school.</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-[#CBD5E1] mt-3 leading-relaxed">
                    Whether you are an educator exploring what tomorrow's lesson preparation could look like, an SMT weighing a controlled pilot, or a DBE leader evaluating national cost-recovery models — the conversation begins with your school's verified CAPS documents and templates.
                  </p>
                </div>

                {/* Phased Roadmap */}
                <div className="space-y-3">
                  <p className="kick text-amber-400 text-[10px]">12-Week Pilot Protocol</p>
                  
                  <div className="panel p-4 flex gap-3.5 items-start border-[rgba(148,163,255,0.16)] bg-[#0A1428]">
                    <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                      W1-2
                    </div>
                    <div className="text-xs space-y-0.5">
                      <h4 className="font-bold text-white">Phase 1 · Seed & Baseline</h4>
                      <p className="text-[#CBD5E1] leading-relaxed">
                        One class, one focus subject. Ingest real screening data as baseline. No school-wide disruption.
                      </p>
                    </div>
                  </div>

                  <div className="panel p-4 flex gap-3.5 items-start border-[rgba(148,163,255,0.16)] bg-[#0A1428]">
                    <div className="w-10 h-10 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                      W3-8
                    </div>
                    <div className="text-xs space-y-0.5">
                      <h4 className="font-bold text-white">Phase 2 · Observed Movement</h4>
                      <p className="text-[#CBD5E1] leading-relaxed">
                        Track progress against your own baseline. First live SBST ratification review with full data quarantine.
                      </p>
                    </div>
                  </div>

                  <div className="panel p-4 flex gap-3.5 items-start border-[rgba(148,163,255,0.16)] bg-[#0A1428]">
                    <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                      W9-12
                    </div>
                    <div className="text-xs space-y-0.5">
                      <h4 className="font-bold text-white">Phase 3 · SMT Expansion Gate</h4>
                      <p className="text-[#CBD5E1] leading-relaxed">
                        Formal SMT review of measured reading growth, language coverage, and teacher satisfaction before phase-by-phase expansion.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Accessible School Pricing Callout */}
                <div className="panel2 p-4 border border-emerald-500/30 bg-[#07171E] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="kick text-[10px] text-emerald-400">AFFORDABLE SCHOOL PRICING</span>
                    <span className="chip text-[10px] border-emerald-500/30 text-emerald-300 font-mono">
                      R4,000 / month (ZAR)
                    </span>
                  </div>
                  <p className="text-xs text-[#E9EDF8] font-bold">
                    Transparent Single-Subscription Rate Per Institution
                  </p>
                  <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                    Includes all 46 specialist AI agents, unlimited teacher lesson &amp; assessment drafts, SIAS case coordination, and af-south-1 POPIA data protection. No student-head taxes or hidden per-seat licensing.
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-2 pt-2 text-xs">
                  <span className="chip border-cyan-500/30 text-cyan-300">🇿🇦 af-south-1 residency</span>
                  <span className="chip border-emerald-500/30 text-emerald-300">🔐 POPIA-aligned</span>
                  <span className="chip border-amber-500/30 text-amber-300">🧑‍🏫 Human-in-the-loop</span>
                  <span className="chip border-violet-500/30 text-violet-300">📚 CAPS & ATP grounded</span>
                </div>
              </div>

              {/* Right Column: Inquiry Form */}
              <div className="lg:col-span-6 panel p-6 sm:p-8 border-cyan-500/40 bg-[#0A162D] space-y-5">
                {!formSubmitted ? (
                  <>
                    <div>
                      <h3 className="text-xl font-bold text-white">Initiate A School Conversation</h3>
                      <p className="text-xs text-[#CBD5E1] mt-1">
                        Tell us about your institution. An educational specialist will respond within two working days.
                      </p>
                    </div>

                    {formError && (
                      <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="kick text-[10px] block mb-1">Your Full Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Naledi Mokoena"
                          className="inp w-full"
                        />
                      </div>

                      <div>
                        <label className="kick text-[10px] block mb-1">School / Institution *</label>
                        <input
                          type="text"
                          required
                          value={formData.school}
                          onChange={e => setFormData({ ...formData, school: e.target.value })}
                          placeholder="e.g. Benjamin Pine Primary"
                          className="inp w-full"
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="kick text-[10px] block mb-1">Role *</label>
                          <select
                            required
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="inp w-full"
                          >
                            <option value="">Select role...</option>
                            <option value="Teacher">Teacher</option>
                            <option value="Head of Department">Head of Department</option>
                            <option value="Principal / SMT">Principal / SMT</option>
                            <option value="SBST Member">SBST Member</option>
                            <option value="District / DBE Official">District / DBE Official</option>
                            <option value="Parent / SGB">Parent / SGB</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="kick text-[10px] block mb-1">Email *</label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="you@school.edu.za"
                            className="inp w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="kick text-[10px] block mb-1">Primary Area Of Interest *</label>
                        <select
                          value={formData.interest}
                          onChange={e => setFormData({ ...formData, interest: e.target.value })}
                          className="inp w-full"
                        >
                          <option value="Curriculum Engine (planning)">Curriculum Engine (Lesson & Term Planning)</option>
                          <option value="Support Analytics (MTSS / SIAS)">Support Analytics (MTSS / SIAS Tiering)</option>
                          <option value="Teaching & Learning Toolbox">Teaching & Learning Toolbox (Materials & Decodables)</option>
                          <option value="Teacher Professional Development">Teacher Professional Development Courses</option>
                          <option value="Full Ecosystem Pilot">Full Ecosystem 12-Week Pilot</option>
                        </select>
                      </div>

                      <div>
                        <label className="kick text-[10px] block mb-1">Context / Focus Grades / Current Challenges</label>
                        <textarea
                          rows={3}
                          value={formData.notes}
                          onChange={e => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Grades, home languages, PIRLS reading gaps, or specific SMT goals..."
                          className="inp w-full"
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-p w-full py-2.5 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Transmit Pilot Enquiry</span>
                      </button>

                      <p className="text-[10px] text-[#CBD5E1] text-center">
                        Data is used exclusively to respond to this enquiry under strict POPIA compliance.
                      </p>
                    </form>
                  </>
                ) : (
                  <div className="py-8 text-center space-y-4 animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto text-2xl">
                      🎉
                    </div>
                    <h3 className="text-2xl font-bold text-white">Pilot Enquiry Received</h3>
                    <p className="text-xs text-[#CBD5E1] max-w-md mx-auto leading-relaxed">
                      Thank you, <strong className="text-white">{formData.name}</strong>. Our educational deployment team will reach out at <strong className="text-cyan-300">{formData.email}</strong> regarding <strong className="text-white">{formData.school}</strong>.
                    </p>
                    <div className="p-3 rounded-lg bg-[#060D1A] border border-emerald-500/30 text-[11px] text-emerald-300">
                      Topic logged: {formData.interest}
                    </div>
                    <div className="pt-4 flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setFormSubmitted(false);
                          setFormData({ name: '', school: '', role: '', email: '', interest: 'Curriculum Engine (planning)', notes: '' });
                        }}
                        className="btn btn-g text-xs py-1.5 px-3"
                      >
                        Submit Another Enquiry
                      </button>
                      <button
                        onClick={() => navigateTo('home')}
                        className="btn btn-p text-xs py-1.5 px-3"
                      >
                        Return To Home
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Website Footer */}
      <footer className="border-t border-[rgba(148,163,255,0.12)] bg-[#070D1C] py-10 mt-20 text-xs text-[#CBD5E1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid sm:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">INFINITE-<span className="text-cyan-400">AI</span></span>
              <span className="chip text-[9px] py-0 px-1.5 border-emerald-500/30 text-emerald-300 font-mono">
                Product Showcase
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#CBD5E1]">
              Brain-Powered Education Ecosystem · Multi-tenant SaaS for South African schools. Grounded in CAPS canon, ATP pacing, SIAS guidance, and strict POPIA compliance.
            </p>
            <p className="text-[10px] text-emerald-400 font-mono">
              Repository: Sarah-JaneHarding/infinite-ai-ecosystem
            </p>
          </div>

          <div className="space-y-2">
            <p className="kick text-[10px] text-cyan-400">Narrative Chapters</p>
            <div className="flex flex-col gap-1.5 text-[11px]">
              <button onClick={() => navigateTo('problem')} className="text-left hover:text-white transition-colors">01 · The Problem, In Plain Terms</button>
              <button onClick={() => navigateTo('ecosystem')} className="text-left hover:text-white transition-colors">02 · The Product, As An Ecosystem (7 Habitats)</button>
              <button onClick={() => navigateTo('how')} className="text-left hover:text-white transition-colors">03 · How We Solve It & 4 Laws</button>
              <button onClick={() => navigateTo('roles')} className="text-left hover:text-white transition-colors">04 · Who It's For & Personas</button>
              <button onClick={() => navigateTo('trust')} className="text-left hover:text-white transition-colors">05 · Trust, Made Visible</button>
              <button onClick={() => navigateTo('pd')} className="text-left hover:text-white transition-colors">06 · Grow The People (PD Courses)</button>
              <button onClick={() => navigateTo('start')} className="text-left text-amber-300 hover:text-white transition-colors font-semibold">07 · Start A School Pilot →</button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="kick text-[10px] text-amber-400">Our Standing Principle</p>
            <p className="text-[11px] text-[#E9EDF8] italic border-l-2 border-amber-400 pl-2.5 py-0.5">
              "AI drafts. The teacher decides. Always."
            </p>
            <p className="text-[10px] text-[#CBD5E1]">
              Nothing reaches a learner or guardian without explicit human countersignature. A gate that cannot be bypassed in production.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 mt-8 border-t border-[rgba(148,163,255,0.08)] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px]">
          <p>© 2026 INFINITE-AI · Evidence, System, Capacity — working together.</p>
          <div className="flex items-center gap-3">
            <a 
              href="https://github.com/Sarah-JaneHarding/infinite-ai-ecosystem" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>Sarah-JaneHarding/infinite-ai-ecosystem</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
