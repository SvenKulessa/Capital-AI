/**
 * CAPITAL AI — LEARNING PORTAL & FINANZ-VOKABULAR TERMINAL
 * 
 * Zentrales Learning Portal der Anwendung.
 * Beinhaltet:
 * 1. Vollständiges Market Vocabulary & Glossar (Filterbar nach Kategorien & Skill-Levels)
 * 2. Öffentliche Analyse-Module & Methodik (Werkzeuge, Datenpfade, Modulaufbau)
 * 3. Architektur-Video-Vorschau (Renderer-Evidence bleibt fail-closed)
 * 4. Quant- & Trader Skill-Check (Interaktives Quiz)
 */

import { VocabularyCard } from './VocabularyCard';
import { LearningArticles } from './LearningArticles';
import { LearningInquiry } from './LearningInquiry';
import { LearningPurchase } from './LearningPurchase';
import { LearningVideos } from './LearningVideos';
import { ChartRecognitionQuiz } from './ChartRecognitionQuiz';
import { useLearningFavorites } from './LearningFavorites';
import { dailyLearningQuestions, freeVocabularySelection } from './learningPolicy';
import { ChartLearningAtlas } from './ChartLearningAtlas';
import React, { useEffect, useState, useMemo } from 'react';
import {
  Star,
  BookOpen,
  Search,
  Filter,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Calculator,
  ShieldCheck,
  Zap,
  TrendingUp,
  HelpCircle,
  Award,
  Layers,
  FileText,
  ChevronDown,
  ExternalLink,
  Code2,
  PlayCircle,
  Video,
} from 'lucide-react';
import {
  VOCABULARY_CATEGORIES,
  VOCABULARY_TERMS,
  VocabularyCategory,
  VocabularyLevel,
  VocabularyTerm,
  vocabularySkillLevel,
} from '../../data/vocabularyData';
import { useHubTab } from '../../hooks/useHubTab';
import { updatePageSEO } from '../../utils/analytics';
import { VOCABULARY_GRANT_KEY, formatVocabularyPrice } from '../../data/vocabularyOffer';

const VocabularyFlashcards = React.lazy(() =>
  import('../../components/VocabularyFlashcards').then(module => ({
    default: module.VocabularyFlashcards,
  })),
);

export type LearningPortalTab = 'glossar' | 'flashcards' | 'guides' | 'patterns' | 'videos' | 'quiz' | 'news';
const LEARNING_TABS: readonly LearningPortalTab[] = ['glossar', 'flashcards', 'guides', 'patterns', 'videos', 'quiz', 'news'];

interface LearningPortalPageProps {
  onBackToHome?: () => void;
  onNavigateLogin?: () => void;
  onNavigateTab?: (path: string) => void;
  initialTab?: LearningPortalTab;
  initialVocabularyTermId?: string;
}

export const LearningPortalPage: React.FC<LearningPortalPageProps> = ({
  onBackToHome,
  onNavigateLogin,
  onNavigateTab,
  initialTab = 'glossar',
  initialVocabularyTermId,
}) => {
  const termFromLink = initialVocabularyTermId ?? (typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search).get('term') ?? undefined);
  const favorites = useLearningFavorites();
  const [atlasEntitled, setAtlasEntitled] = useState(false);
  const [chartQuizEntitled, setChartQuizEntitled] = useState(false);
  const [activeTab, setActiveTab] = useHubTab(LEARNING_TABS, initialTab);


  // Vocabulary Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<VocabularyCategory>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [expandedTermId, setExpandedTermId] = useState<string | null>(termFromLink ?? null);
  const [focusedTermId, setFocusedTermId] = useState<string | null>(termFromLink ?? null);
  const [copiedTermId, setCopiedTermId] = useState<string | null>(null);
  const [protectedTerms, setProtectedTerms] = useState<VocabularyTerm[]>([]);
  const fullVocabularyTerms = useMemo(() => [...VOCABULARY_TERMS, ...protectedTerms], [protectedTerms]);

  // Quiz States
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizDate, setQuizDate] = useState(() => new Date());
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [entitled, setEntitled] = useState<boolean>(false);
  const [quizPreviouslyUsed, setQuizPreviouslyUsed] = useState<boolean>(false);
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [accessLoaded, setAccessLoaded] = useState<boolean>(false);
  const [quizAccessError, setQuizAccessError] = useState<string>('');
  const allVocabularyTerms = useMemo(() => entitled ? fullVocabularyTerms : freeVocabularySelection(fullVocabularyTerms), [entitled, fullVocabularyTerms]);

  useEffect(() => {
    if (!termFromLink) {
      setFocusedTermId(null);
      return;
    }

    const term = allVocabularyTerms.find((candidate) => candidate.id === termFromLink);
    if (!term) return;

    setActiveTab('glossar');
    setFocusedTermId(term.id);
    setExpandedTermId(term.id);
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedLevel('ALL');

    updatePageSEO({
      title: `${term.term} – Definition & Thesaurus | Capital-AI`,
      description: `${term.shortDefinition} Kategorie: ${term.categoryLabel}. Drei Thesaurus-Begriffe im Capital-AI Vocabulary.`,
      canonicalPath: `/vocabulary/${term.id}`,
    });
  }, [termFromLink, setActiveTab, allVocabularyTerms]);


  useEffect(() => {
    let cancelled = false;

    async function syncVocabularyAccess() {
      const preview = await fetch('/api/learning/vocabulary/preview').then(r => r.ok ? r.json() : null).catch(() => null);
      if (!cancelled && Array.isArray(preview?.terms)) setProtectedTerms(preview.terms);
      const params = new URLSearchParams(window.location.search);
      const trialSession=params.get('enterprise_trial_session');
      if(trialSession) await fetch(`/api/billing/enterprise/trial?session_id=${encodeURIComponent(trialSession)}`,{method:'POST'}).catch(()=>null);
      const sessionId = params.get('vocabulary_session') || window.localStorage.getItem(VOCABULARY_GRANT_KEY) || '';

      try {
        if (sessionId) {
          const entitlementResponse = await fetch(
            `/api/billing/vocabulary/entitlement?session_id=${encodeURIComponent(sessionId)}`,
          );
          if (entitlementResponse.ok) {
            const entitlement = await entitlementResponse.json();
            if (entitlement?.entitled) {
              window.localStorage.setItem(VOCABULARY_GRANT_KEY, sessionId);
            }
          }
        }

        const accessResponse = await fetch('/api/billing/vocabulary/access', {
          headers: { Accept: 'application/json' },
        });
        if (cancelled) return;
        if (accessResponse.status === 401) {
          setAuthenticated(false);
          setAccessLoaded(true);
          return;
        }
        if (!accessResponse.ok) throw new Error('VOCABULARY_ACCESS_UNAVAILABLE');

        const access = await accessResponse.json();
        if (cancelled) return;
        setAuthenticated(true);
        setEntitled(Boolean(access?.quantProEntitled));
        setAtlasEntitled(access?.atlasEntitled === true);
        setChartQuizEntitled(access?.chartQuizEntitled === true);
        setQuizPreviouslyUsed(Boolean(access?.quizUsed));

        if (access?.quantProEntitled) {
          const protectedResponse = await fetch('/api/learning/vocabulary/quant-pro', {
            headers: { Accept: 'application/json' },
          });
          if (!protectedResponse.ok) throw new Error('QUANT_PRO_UNAVAILABLE');
          const protectedPayload = await protectedResponse.json();
          if (!cancelled && Array.isArray(protectedPayload?.terms)) {
            setProtectedTerms(protectedPayload.terms as VocabularyTerm[]);
          }
        }
      } catch {
        if (!cancelled) setQuizAccessError('Lernzugang ist momentan nicht verifizierbar.');
      } finally {
        if (!cancelled) setAccessLoaded(true);
      }
    }

    void syncVocabularyAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered Vocabulary Terms
  const filteredTerms = useMemo(() => {
    return allVocabularyTerms.filter((term) => {
      if (focusedTermId && term.id !== focusedTermId) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'ALL' && term.category !== selectedCategory) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'ALL' && vocabularySkillLevel(term) !== selectedLevel) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTerm = term.term.toLowerCase().includes(query);
        const matchesAbbr = term.abbreviation?.toLowerCase().includes(query);
        const matchesShort = term.shortDefinition.toLowerCase().includes(query);
        const matchesDetail = term.detailedExplanation.toLowerCase().includes(query);
        const matchesFormula = term.formulaOrRule?.toLowerCase().includes(query);
        const matchesCat = term.categoryLabel.toLowerCase().includes(query);
        const matchesThesaurus = term.thesaurus.some((entry) => entry.toLowerCase().includes(query));
        if (!matchesTerm && !matchesAbbr && !matchesShort && !matchesDetail && !matchesFormula && !matchesCat && !matchesThesaurus) {
          return false;
        }
      }
      return true;
    });
  }, [allVocabularyTerms, focusedTermId, selectedCategory, selectedLevel, searchQuery]);

  const handleCopyDefinition = (term: VocabularyTerm, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${term.term} (${term.abbreviation || term.categoryLabel})\n\nThesaurus:\n${term.thesaurus.join(' · ')}\n\nDefinition:\n${term.shortDefinition}\n\nErklärung:\n${term.detailedExplanation}\n\nFaustformel / Regel:\n${term.formulaOrRule || 'N/A'}\n\nPraxisbeispiel:\n${term.practicalExample}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedTermId(term.id);
      setTimeout(() => setCopiedTermId(null), 2200);
    }
  };

  const getLevelBadge = (level: VocabularyLevel) => {
    switch (level) {
      case 'Einsteiger':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Einsteiger
          </span>
        );
      case 'Fortgeschritten':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Fortgeschritten
          </span>
        );
      case 'Quant / Pro':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-400/30">
            Quant / Pro
          </span>
        );
    }
  };

  const QUIZ_QUESTIONS = dailyLearningQuestions(quizDate, entitled);

  return (
    <div className="w-full text-slate-100 min-h-screen py-4 sm:py-6 px-2 sm:px-6 relative">
      {/* 1. TOP HEADER CONTRACT (Breadcrumb + Controls) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-5 border-b border-slate-800/80 mb-6">
        <div>
          {/* Breadcrumb Hierarchy */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-medium">
            <button type="button" onClick={onBackToHome} className="hover:text-amber-300 transition-colors">
              Capital-AI
            </button>
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('glossar');
                onNavigateTab?.('/learning');
              }}
              className="text-amber-400 font-semibold hover:text-amber-200 transition-colors"
            >
              Learning Portal
            </button>
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            <span className="text-cyan-300 font-medium">
              {activeTab === 'news' && 'Öffentliche Lernimpulse'}
          {activeTab === 'glossar' && 'Finanz-Vocabulary & Glossar'}
              {activeTab === 'flashcards' && 'Vocabulary Flashcards'}
              {activeTab === 'guides' && 'Analyse-Module & Methodik'}
              {activeTab === 'patterns' && 'Chart-Lernatlas'}
              {activeTab === 'videos' && 'Lernvideos'}
              {activeTab === 'quiz' && 'Quant & Trader Skill-Check'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-amber-400 shrink-0" />
              <span>Capital-AI Learning Portal</span>
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
              WISSENS-TERMINAL
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              {fullVocabularyTerms.length} Fachbegriffe &amp; Formeln
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Zurück zur Übersicht</span>
            </button>
          )}

          {onNavigateLogin && (
            <button
              type="button"
              onClick={onNavigateLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition-colors cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Terminal Login</span>
            </button>
          )}
        </div>
      </div>
      <LearningInquiry />

      <label className="mb-4 block text-sm text-amber-200 sm:hidden">Lernbereich auswählen
        <select value={activeTab} onChange={event=>setActiveTab(event.target.value as LearningPortalTab)} className="mt-2 min-h-11 w-full rounded-lg border border-amber-400/30 bg-slate-950 p-3 text-white">
          {LEARNING_TABS.map(tab=><option key={tab} value={tab}>{{glossar:'Vocabulary & Glossar',flashcards:'Karteikasten',guides:'Modul-Erklärungen',patterns:'Chart-Lernatlas',videos:'Lernvideos',quiz:'Tagesquiz',news:'Öffentliche Lernimpulse'}[tab]}</option>)}
        </select>
      </label>
      {/* 3. LEARNING PORTAL TABS */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090e21] border border-slate-800/90 mb-6 overflow-x-auto scrollbar-none">
        <button type="button" onClick={() => setActiveTab('news')} aria-current={activeTab === 'news' ? 'page' : undefined}
          className={`min-h-11 rounded-lg px-3.5 text-xs whitespace-nowrap ${activeTab === 'news' ? 'bg-amber-400 text-black' : 'text-slate-200 hover:bg-white/5'}`}>Lernimpulse · News</button>
        {/* TAB 1: GLOSSAR / VOCABULARY */}
        <button
          type="button"
          onClick={() => setActiveTab('glossar')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'glossar'
              ? 'bg-amber-400 text-black font-bold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Market Vocabulary &amp; Glossar</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30 font-mono">
            {fullVocabularyTerms.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flashcards')}
          aria-current={activeTab === 'flashcards' ? 'page' : undefined}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'flashcards'
              ? 'bg-amber-400 text-black font-bold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Vocabulary Flashcards</span>
        </button>

        {/* TAB 2: CHEAT-SHEETS & GUIDES */}
        <button
          type="button"
          onClick={() => setActiveTab('guides')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'guides'
              ? 'bg-cyan-500 text-black font-bold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Analyse-Module &amp; Methodik</span>
        </button>

        <button type="button" onClick={() => setActiveTab('patterns')} aria-current={activeTab === 'patterns' ? 'page' : undefined}
          className={`rounded-lg px-3.5 py-2 text-xs font-medium whitespace-nowrap ${activeTab === 'patterns' ? 'bg-cyan-300 text-black' : 'text-slate-200 hover:bg-white/5'}`}>
          Chart-Lernatlas
        </button>
        {/* TAB 3: LERNVIDEOS */}
        <button
          type="button"
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'videos'
              ? 'bg-emerald-500 text-black font-bold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>Lernvideos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-mono">Vorschau</span>
        </button>

        {/* TAB 4: QUIZ & SKILL-CHECK */}
        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-amber-400 text-black font-bold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Quant &amp; Trader Skill-Check</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: MARKET VOCABULARY & GLOSSAR                                */}
      {/* ========================================================================= */}
      {activeTab === 'news' && <LearningArticles />}
      {activeTab === 'flashcards' && (
        <React.Suspense fallback={<p role="status" className="p-4 text-sm text-slate-400">Karteikarten werden geladen …</p>}>
          <VocabularyFlashcards entitled={entitled} terms={allVocabularyTerms} onNavigate={(path) => onNavigateTab?.(path)} />
        </React.Suspense>
      )}

      {activeTab === 'glossar' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-400/15 via-[#0d1530] to-cyan-500/15 border border-amber-400/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>INTERAKTIVES FINANZ-, TECH- &amp; QUANT-LEXIKON</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Capital-AI Vocabulary &amp; Thesaurus
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Durchsuchen Sie {fullVocabularyTerms.length} konsolidierte Fachbegriffe aus Marktanalyse, Scoring,
                  Daten &amp; Evidence, Plattformarchitektur, Security, Produkt, Governance und Mobile Runtime.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-black/40 border border-amber-400/30 text-amber-300">
                  {filteredTerms.length} von {fullVocabularyTerms.length} Begriffen
                </span>
              </div>
            </div>
          </div>

          {focusedTermId && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
              <div className="text-xs text-cyan-100">
                Einzelansicht für einen indexierbaren Vocabulary-Begriff.
              </div>
              <a
                href="/vocabulary"
                className="text-xs font-bold text-amber-300 hover:text-amber-200 underline underline-offset-4"
              >
                Alle {fullVocabularyTerms.length} Begriffe anzeigen
              </a>
            </div>
          )}

          {/* Filter Bar: Search + Category Buttons + Level Buttons */}
          <div className="p-4 rounded-xl bg-[#090e21] border border-slate-800/90 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setFocusedTermId(null);
                  setSearchQuery(e.target.value);
                }}
                aria-label="Vocabulary durchsuchen"
                placeholder="Begriff, Abkürzung oder Thesaurus suchen (z.B. VWAP, OIDC, Gate, Scorer)..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-black/40 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setFocusedTermId(null);
                    setSearchQuery('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <label className="block text-xs text-amber-200">Kategorie
              <select value={selectedCategory} onChange={event => { setFocusedTermId(null); setSelectedCategory(event.target.value as VocabularyCategory); }}
                className="mt-2 min-h-11 w-full rounded-lg border border-amber-400/30 bg-[#090e21] p-3 text-slate-100 focus-visible:outline-2 focus-visible:outline-amber-300">
                {VOCABULARY_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
              </select>
            </label>

            {/* Four clear public skill tiers; buttons remain on one row on narrow devices. */}
            <div className="space-y-2 border-t border-slate-800/80 pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">Skill-Level</span>
                <button type="button" onClick={() => { setFocusedTermId(null); setSelectedLevel('ALL'); }}
                  aria-pressed={selectedLevel === 'ALL'}
                  className="min-h-11 rounded-lg px-3 text-xs font-semibold text-amber-200 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-amber-300">
                  Alle anzeigen
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Skill-Level auswählen">
                {(['Starter', 'Elite', 'Enterprise', 'Quant'] as const).map(lvl => (
                  <button key={lvl} type="button" aria-pressed={selectedLevel === lvl}
                    onClick={() => { setFocusedTermId(null); setSelectedLevel(lvl); }}
                    className={`min-h-11 rounded-lg border px-1 py-2 text-[11px] font-semibold sm:text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                      selectedLevel === lvl ? 'border-amber-400/60 bg-amber-400/20 text-amber-200' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            {!entitled && (
              <div className="pt-2 text-[11px] text-purple-200">
                Kostenlos: sieben feste Einträge je Skill-Level. Learning Portal schaltet alle Begriffe für {formatVocabularyPrice()} einmalig frei.
              </div>
            )}
          </div>

          {favorites.error && <p role="alert" className="text-sm text-rose-300">{favorites.error}</p>}
          {!entitled && <LearningPurchase onLogin={onNavigateLogin} />}
          {/* Vocabulary Terms Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTerms.length === 0 ? (
              <div className="md:col-span-2 p-8 rounded-xl bg-black/20 border border-slate-800 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400 font-medium">Keine passenden Begriffe gefunden.</p>
                <button
                  type="button"
                  onClick={() => {
                    setFocusedTermId(null);
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setSelectedLevel('ALL');
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-400/10 text-amber-300 text-xs font-bold hover:bg-amber-400/20 cursor-pointer"
                >
                  Filter zurücksetzen
                </button>
              </div>
            ) : (
              filteredTerms.map(term => <VocabularyCard key={term.id} term={term} initialExpanded={expandedTermId === term.id}
                saved={favorites.ids.includes(term.id)} pending={favorites.pending} onFavorite={id => void favorites.toggle(id)} />)
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: CHEAT-SHEETS & PIPELINE GUIDES                             */}
      {/* ========================================================================= */}
      {activeTab === 'patterns' && (atlasEntitled ? <><ChartLearningAtlas /><ChartRecognitionQuiz allowed={chartQuizEntitled} /></> : <p className="rounded-xl border border-amber-400/30 p-5 text-slate-200">Chart-Lernatlas: mit Learning Portal und aktivem Starter-, Pro- oder Enterprise-Abonnement nutzbar.</p>)}
      {activeTab === 'guides' && !atlasEntitled && <p className="rounded-xl border border-amber-400/30 p-5 text-slate-200">Modul-Erklärungen benötigen Learning Portal und ein aktives Starter-, Pro- oder Enterprise-Abonnement.</p>}
      {activeTab === 'guides' && atlasEntitled && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-[#0d1530] to-purple-500/15 border border-cyan-500/40">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Analyse-Module &amp; Methodik
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Öffentliche Fachübersicht der Analysewerkzeuge und Modulgrenzen. Interne Schwellenwerte,
              Implementierungsdetails, proprietäre Heuristiken, Secrets und produktionsnahe Konfigurationen
              werden hier bewusst nicht offengelegt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="p-5 rounded-xl bg-[#090e21] border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Calculator className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Fundamental- &amp; Value-Modul</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Verwendet validierte Fundamentals, Cashflow-, Bilanz- und Bewertungsmerkmale zur
                strukturierten Einordnung eines Assets. Das Modul trennt Rohfakten, abgeleitete Features
                und Score-Beiträge und kennzeichnet fehlende Pflichtdaten fail-closed.
              </p>
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-xs text-slate-400">
                Werkzeugklassen: Fundamentals-Adapter · Feature-Normalisierung · Value-Faktoren · Evidence-Referenzen.
              </div>
            </section>

            <section className="p-5 rounded-xl bg-[#090e21] border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-300">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Risk- &amp; Evidence-Modul</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bewertet Datenvollständigkeit, Provenienz, Freshness, Ausreißer- und Risikoindikatoren.
                Ergebnisse bleiben von Entscheidungsfreigaben getrennt; Evidence und Reproduzierbarkeit
                sind Bestandteil des Modulvertrags.
              </p>
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-xs text-slate-400">
                Werkzeugklassen: Validation Gates · Freshness · Outlier-Prüfung · Replay-/Evidence-Pfade.
              </div>
            </section>

            <section className="p-5 rounded-xl bg-[#090e21] border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Zap className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Market- &amp; Momentum-Modul</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ordnet kanonische Marktzeitreihen in technische und relative Marktmerkmale ein.
                Provider-, Instrument- und Datenrechte-Gates entscheiden vor jeder Nutzung, ob Daten
                überhaupt für Analyse oder Scoring zugelassen sind.
              </p>
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-xs text-slate-400">
                Werkzeugklassen: OHLCV/Quote-Facts · technische Features · Cross-Sectional Ranking · Eligibility Gates.
              </div>
            </section>

            <section className="p-5 rounded-xl bg-[#090e21] border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Sentiment- &amp; Kontext-Modul</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Führt zugelassene News-, Social-, Makro- oder On-Chain-Kontexte als getrennte Evidence-
                und Feature-Kanäle. Quellenstatus und Rechte werden nicht aus dem Frontend abgeleitet.
              </p>
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-xs text-slate-400">
                Werkzeugklassen: Source Adapters · Normalisierung · Kontext-Features · Confidence-/Evidence-Verknüpfung.
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: ARCHITEKTUR-VIDEO-VORSCHAU                                */}
      {/* ========================================================================= */}
      {activeTab === 'videos' && <LearningVideos entitled={entitled} />}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: INTERACTIVE QUIZ & SKILL-CHECK                             */}
      {/* ========================================================================= */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/15 via-[#0d1530] to-emerald-500/15 border border-amber-400/30">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-300" />
              <span>Quant &amp; Trader Skill-Check</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">Täglich wechselnde Fragen zu Finanzbildung und Quellenbewertung.</p>
            <p className="mt-2 text-xs text-amber-200">Referenzen: öffentlich zugängliche Lernimpulse aus diesem Portal. Die Fragen wechseln täglich; keine Repository-News.</p>
          </div>

          {!accessLoaded ? (
            <div className="p-8 rounded-xl bg-[#090e21] border border-slate-800 text-center text-xs text-slate-300 max-w-md mx-auto">
              Lernzugang wird serverseitig geprüft…
            </div>
          ) : !authenticated ? (
            <div className="p-8 rounded-xl bg-[#090e21] border border-amber-400/30 text-center space-y-4 max-w-md mx-auto">
              <Award className="w-12 h-12 text-amber-300 mx-auto" />
              <h3 className="text-xl font-bold text-white">Anmeldung für den Skill-Check erforderlich</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Eine kostenlose Frage pro Tag und Benutzerkonto. Tageswechsel: Europe/Berlin.
              </p>
              <button type="button" onClick={onNavigateLogin} className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 cursor-pointer">
                Anmelden
              </button>
            </div>
          ) : !quizStarted && !entitled && quizPreviouslyUsed ? (
            <div className="p-8 rounded-xl bg-[#090e21] border border-amber-400/30 text-center space-y-4 max-w-md mx-auto">
              <Award className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Tagesfrage bereits verwendet</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Die nächste kostenlose Frage steht morgen bereit. Learning Portal bietet vollständige Quizzes für {formatVocabularyPrice()} einmalig.
              </p>
              <button type="button" onClick={() => setActiveTab('glossar')} className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 cursor-pointer">
                Learning Portal ansehen
              </button>
            </div>
          ) : !quizStarted ? (
            <div className="p-8 rounded-xl bg-[#090e21] border border-amber-400/30 text-center space-y-4 max-w-md mx-auto">
              <Award className="w-12 h-12 text-amber-300 mx-auto" />
              <h3 className="text-xl font-bold text-white">{entitled ? 'Skill-Check starten' : 'Eine kostenlose Tagesfrage'}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {entitled
                  ? 'Ihr Learning-Portal-Zugang ist aktiv. Der Skill-Check kann erneut gestartet werden.'
                  : 'Mit Start wird Ihre heutige kostenlose Frage serverseitig verbraucht.'}
              </p>
              {quizAccessError && <p className="text-xs text-rose-300">{quizAccessError}</p>}
              <button
                type="button"
                onClick={() => {
                  setQuizAccessError('');
                  void fetch('/api/learning/vocabulary/quiz/consume', {
                    method: 'POST',
                    headers: { Accept: 'application/json' },
                  })
                    .then(async (response) => {
                      const body = await response.json().catch(() => ({}));
                      if (response.status === 409) {
                        setQuizPreviouslyUsed(true);
                        throw new Error('QUIZ_ALREADY_USED');
                      }
                      if (!response.ok || !body?.allowed) throw new Error('QUIZ_ACCESS_DENIED');
                      setQuizPreviouslyUsed(Boolean(body?.quizUsed));
                      setQuizDate(new Date());
                      setQuizStarted(true);
                    })
                    .catch((error) => {
                      if (error?.message !== 'QUIZ_ALREADY_USED') {
                        setQuizAccessError('Quiz-Start konnte serverseitig nicht freigegeben werden.');
                      }
                    });
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 cursor-pointer"
              >
                Skill-Check starten
              </button>
            </div>
          ) : !quizFinished ? (
            <div className="p-6 rounded-xl bg-[#090e21] border border-slate-800 space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Frage {currentQuizIndex + 1} von {QUIZ_QUESTIONS.length}</span>
                <span className="text-amber-400 font-bold">Punkte: {quizScore}</span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${((currentQuizIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                />
              </div>

              <h3 className="text-sm sm:text-base font-bold text-white pt-2">
                {QUIZ_QUESTIONS[currentQuizIndex].question}
              </h3>

              <div className="space-y-2 pt-2">
                {QUIZ_QUESTIONS[currentQuizIndex].options.map((opt, idx) => {
                  const isSelected = selectedQuizAnswer === idx;
                  const isAnswered = selectedQuizAnswer !== null;
                  const isCorrect = idx === QUIZ_QUESTIONS[currentQuizIndex].correct;

                  let btnStyle = 'bg-black/40 border-slate-800 hover:border-slate-700 text-slate-300';
                  if (isAnswered) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-200';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => {
                        setSelectedQuizAnswer(idx);
                        if (idx === QUIZ_QUESTIONS[currentQuizIndex].correct) {
                          setQuizScore((prev) => prev + 1);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${btnStyle}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full border border-slate-700 text-[10px] font-mono flex items-center justify-center shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedQuizAnswer !== null && (
                <div className="p-3 rounded-lg bg-black/60 border border-slate-800 text-xs space-y-2 animate-in fade-in">
                  <div className="font-mono text-[11px] text-amber-400 font-bold">Erklärung:</div>
                  <p className="text-slate-300 leading-relaxed">
                    {QUIZ_QUESTIONS[currentQuizIndex].explanation}
                  </p>
                  <a className="text-cyan-200 underline" href={`/learning?tab=news#${QUIZ_QUESTIONS[currentQuizIndex].reference.id}`}>Referenz: {QUIZ_QUESTIONS[currentQuizIndex].reference.title}</a>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuizAnswer(null);
                        if (currentQuizIndex + 1 < QUIZ_QUESTIONS.length) {
                          setCurrentQuizIndex((prev) => prev + 1);
                        } else {
                          setQuizFinished(true);
                        }
                      }}
                      className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-black font-bold text-xs cursor-pointer"
                    >
                      {currentQuizIndex + 1 < QUIZ_QUESTIONS.length ? 'Nächste Frage →' : 'Ergebnis anzeigen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#090e21] border border-slate-800 text-center space-y-4 max-w-md mx-auto">
              <Award className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Skill-Check abgeschlossen!</h3>
              <p className="text-xs text-slate-300">
                Sie haben <strong className="text-amber-400 text-base">{quizScore}</strong> von{' '}
                <strong className="text-white">{QUIZ_QUESTIONS.length}</strong> Fragen richtig beantwortet.
              </p>
              {entitled ? (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuizIndex(0);
                    setSelectedQuizAnswer(null);
                    setQuizScore(0);
                    setQuizFinished(false);
                    setQuizStarted(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 cursor-pointer"
                >
                  Quiz wiederholen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('glossar')}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 cursor-pointer"
                >
                  Learning Portal für {formatVocabularyPrice()} ansehen
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
