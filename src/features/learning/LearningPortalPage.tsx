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

import React, { useEffect, useState, useMemo } from 'react';
import {
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
} from '../../data/vocabularyData';
import { useHubTab } from '../../hooks/useHubTab';
import { updatePageSEO } from '../../utils/analytics';
import { VOCABULARY_GRANT_KEY, formatVocabularyPrice } from '../../data/vocabularyOffer';

const VocabularyFlashcards = React.lazy(() =>
  import('../../components/VocabularyFlashcards').then(module => ({
    default: module.VocabularyFlashcards,
  })),
);

export type LearningPortalTab = 'glossar' | 'flashcards' | 'guides' | 'videos' | 'quiz';
const LEARNING_TABS: readonly LearningPortalTab[] = ['glossar', 'flashcards', 'guides', 'videos', 'quiz'];

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
  const [activeTab, setActiveTab] = useHubTab(LEARNING_TABS, initialTab);


  // Vocabulary Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<VocabularyCategory>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [expandedTermId, setExpandedTermId] = useState<string | null>(initialVocabularyTermId ?? null);
  const [focusedTermId, setFocusedTermId] = useState<string | null>(initialVocabularyTermId ?? null);
  const [copiedTermId, setCopiedTermId] = useState<string | null>(null);
  const [protectedTerms, setProtectedTerms] = useState<VocabularyTerm[]>([]);
  const allVocabularyTerms = useMemo(
    () => [...VOCABULARY_TERMS, ...protectedTerms],
    [protectedTerms],
  );

  useEffect(() => {
    if (!initialVocabularyTermId) {
      setFocusedTermId(null);
      return;
    }

    const term = allVocabularyTerms.find((candidate) => candidate.id === initialVocabularyTermId);
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
  }, [initialVocabularyTermId, setActiveTab, allVocabularyTerms]);

  // Quiz States
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [entitled, setEntitled] = useState<boolean>(false);
  const [quizPreviouslyUsed, setQuizPreviouslyUsed] = useState<boolean>(false);
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [accessLoaded, setAccessLoaded] = useState<boolean>(false);
  const [quizAccessError, setQuizAccessError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function syncVocabularyAccess() {
      const params = new URLSearchParams(window.location.search);
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
      if (selectedLevel !== 'ALL' && term.level !== selectedLevel) {
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
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
            Quant / Pro
          </span>
        );
    }
  };

  // Interactive Quiz Questions
  const QUIZ_QUESTIONS = [
    {
      question: 'Welche Bedingung muss für den Warren Buffett Value Check primär erfüllt sein?',
      options: [
        'Kurs liegt unter dem 200-Tage-Durchschnitt',
        'Eigenkapitalrendite (ROE) dauerhaft > 15% mit intaktem Moat und Sicherheitsmarge',
        'Latenz des Datenfeeds liegt unter 10ms',
        'Handelsvolumen übersteigt 100 Mio. $ täglich',
      ],
      correct: 1,
      explanation:
        'Warren Buffett investiert nur in Unternehmen mit dauerhaft hoher Kapitalrendite (ROE > 15%), verständlichem Burggraben (Economic Moat) und einer Sicherheitsmarge (Margin of Safety) zum fairen inneren Wert.',
    },
    {
      question: 'Wozu dient die WORM-Archivierung nach BaFin WpHG § 83 im Capital-AI System?',
      options: [
        'Zur Beschleunigung von WebSocket-Datenströmen',
        'Zur unveränderbaren und revisionssicheren 5-Jahres-Aufbewahrung aller Scores und Algorithmen-Signale',
        'Zum automatischen Ankauf von $CPT Token',
        'Zur Komprimierung von Grafikdateien',
      ],
      correct: 1,
      explanation:
        'Write-Once-Read-Many (WORM) stellt sicher, dass generierte Finanzempfehlungen und Marktdatenschnitte nach WpHG § 83 nachträglich nicht manipuliert werden können.',
    },
    {
      question: 'Was ist der Hauptvorteil eines In-Memory Ringpuffers gegenüber direkten Provider-API Abfragen?',
      options: [
        'Er eliminiert externe Lizenzgebühren vollständig',
        'Er entkoppelt Tausende Frontend-Nutzer von externen Rate-Limits und garantiert Sub-45ms Latenz',
        'Er ersetzt die Notwendigkeit einer Datenbank',
        'Er berechnet automatisch Steuern für Kryptowährungen',
      ],
      correct: 1,
      explanation:
        'Der Ringpuffer hält die neuesten Ticks im Arbeitsspeicher. Anstatt jede Nutzeranfrage an TwelveData oder Binance weiterzuleiten, liefert der Cache Daten in Mikrosekunden und schützt vor dem 40 € Monatsbudget-Deckel (AP-006).',
    },
    {
      question: 'Wie definiert sich das Sortino Ratio im Vergleich zum traditionellen Sharpe Ratio?',
      options: [
        'Es berücksichtigt nur die Abwärtsvolatilität (Downside Deviation) statt der Gesamtvolatilität',
        'Es wird ausschließlich in der Chartanalyse verwendet',
        'Es multipliziert den Gewinn mit der Dividendenrendite',
        'Es misst nur den Bitcoin-Preis im Verhältnis zu Gold',
      ],
      correct: 0,
      explanation:
        'Das Sortino Ratio bestraft nur die nach unten gerichtete Volatilität, da Kursschwankungen nach oben für den Anleger positiv sind.',
    },
    {
      question: 'Welche europäische Verordnung regelt ab 2024/2025 die Standards für Krypto-Assets und Stablecoins?',
      options: ['GDPR', 'MiCA (Markets in Crypto-Assets)', 'MiFID II', 'PSD2'],
      correct: 1,
      explanation:
        'Die EU MiCA-Verordnung 2023/1114 vereinheitlicht den Rechtsrahmen für Krypto-Vermögenswerte, Whitepaper-Pflichten und Reserveanforderungen in der gesamten Europäischen Union.',
    },
  ];

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
              {activeTab === 'glossar' && 'Finanz-Vocabulary & Glossar'}
              {activeTab === 'flashcards' && 'Vocabulary Flashcards'}
              {activeTab === 'guides' && 'Analyse-Module & Methodik'}
              {activeTab === 'videos' && 'Architektur Videos'}
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
              {VOCABULARY_TERMS.length} Fachbegriffe &amp; Formeln
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

      {/* 3. LEARNING PORTAL TABS */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090e21] border border-slate-800/90 mb-6 overflow-x-auto scrollbar-none">
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
            {VOCABULARY_TERMS.length}
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

        {/* TAB 3: ARCHITEKTUR VIDEOS */}
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
          <span>Architektur Videos</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-mono">Vorschau</span>
        </button>

        {/* TAB 4: QUIZ & SKILL-CHECK */}
        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-purple-500 text-white font-bold shadow-sm'
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
      {activeTab === 'flashcards' && (
        <React.Suspense fallback={<p role="status" className="p-4 text-sm text-slate-400">Karteikarten werden geladen …</p>}>
          <VocabularyFlashcards onNavigate={(path) => onNavigateTab?.(path)} />
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
                  Durchsuchen Sie {VOCABULARY_TERMS.length} konsolidierte Fachbegriffe aus Marktanalyse, Scoring,
                  Daten &amp; Evidence, Plattformarchitektur, Security, Produkt, Governance und Mobile Runtime.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-black/40 border border-amber-400/30 text-amber-300">
                  {filteredTerms.length} von {VOCABULARY_TERMS.length} Begriffen
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
                Alle {VOCABULARY_TERMS.length} Begriffe anzeigen
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

            {/* Category Filter Buttons */}
            <div>
              <div className="text-[11px] font-mono text-slate-400 mb-1.5">Kategorie:</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {VOCABULARY_CATEGORIES.map((cat) => {
                  const count =
                    cat.id === 'ALL'
                      ? allVocabularyTerms.length
                      : allVocabularyTerms.filter((t) => t.category === cat.id).length;
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFocusedTermId(null);
                        setSelectedCategory(cat.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-black font-bold shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                      }`}
                    >
                      {cat.label}
                      <span className="ml-1 text-[10px] opacity-70 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skill Level Filter Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">Level:</span>
              {['ALL', 'Einsteiger', 'Fortgeschritten', ...(entitled ? ['Quant / Pro'] : [])].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setFocusedTermId(null);
                    setSelectedLevel(lvl);
                  }}
                  className={`px-2.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                    selectedLevel === lvl
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl === 'ALL' ? 'Alle Level' : lvl}
                </button>
              ))}
            </div>
            {!entitled && (
              <div className="pt-2 text-[11px] text-purple-200">
                Quant / Pro wird mit dem Market-Vocabulary-Paket für {formatVocabularyPrice()} freigeschaltet.
              </div>
            )}
          </div>

          {/* Vocabulary Terms Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTerms.length === 0 ? (
              <div className="col-span-2 p-8 rounded-xl bg-black/20 border border-slate-800 text-center space-y-2">
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
              filteredTerms.map((term) => {
                const isExpanded = expandedTermId === term.id;
                const isCopied = copiedTermId === term.id;

                return (
                  <div
                    key={term.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isExpanded
                        ? 'bg-[#0b122b] border-amber-400/50 shadow-[0_0_15px_rgba(245,176,20,0.12)]'
                        : 'bg-[#090e21] border-slate-800/90 hover:border-slate-700'
                    }`}
                    onClick={() => setExpandedTermId(isExpanded ? null : term.id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                            {term.categoryLabel}
                          </span>
                          {getLevelBadge(term.level)}
                          {term.abbreviation && (
                            <span className="text-xs font-mono font-bold text-amber-400">
                              [{term.abbreviation}]
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                          <a
                            href={`/vocabulary/${term.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="hover:text-amber-300 underline-offset-4 hover:underline"
                            title={`${term.term} als eigene Vocabulary-Seite öffnen`}
                          >
                            {term.term}
                          </a>
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5" aria-label={`Thesaurus zu ${term.term}`}>
                          {term.thesaurus.map((synonym) => (
                            <span
                              key={synonym}
                              className="px-2 py-0.5 rounded-full bg-cyan-400/5 border border-cyan-400/15 text-[10px] font-medium text-cyan-200/80"
                            >
                              {synonym}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Copy Action */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyDefinition(term, e)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                          isCopied
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
                        }`}
                        title="Definition kopieren"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Short Definition */}
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {term.shortDefinition}
                    </p>

                    {/* Formula or Rule of Thumb Preview */}
                    {term.formulaOrRule && (
                      <div className="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] font-mono text-amber-300/90 flex items-center gap-2">
                        <Calculator className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{term.formulaOrRule}</span>
                      </div>
                    )}

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 text-xs animate-in fade-in">
                        <div>
                          <div className="text-[10px] font-mono uppercase text-slate-400">Ausführliche Erklärung:</div>
                          <p className="text-slate-300 mt-0.5 leading-relaxed">{term.detailedExplanation}</p>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono uppercase text-slate-400">Praxisbeispiel:</div>
                          <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-200 leading-relaxed mt-0.5">
                            {term.practicalExample}
                          </div>
                        </div>

                        {term.keyTakeaway && (
                          <div className="flex items-center gap-1.5 text-[10.5px] text-purple-300 font-mono">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>Fazit &amp; Praxistipp: {term.keyTakeaway}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Accordion indicator */}
                    <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                      <span>{isExpanded ? 'Details einklappen' : 'Klicken für Details & Praxisbeispiel'}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-amber-400' : ''
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: CHEAT-SHEETS & PIPELINE GUIDES                             */}
      {/* ========================================================================= */}
      {activeTab === 'guides' && (
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
              <div className="flex items-center gap-2 text-purple-400">
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
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-[#0d1530] to-cyan-500/10 p-6">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
              <Video className="h-4 w-4" />
              ARCHITEKTUR VIDEO LIBRARY · PREVIEW
            </div>
            <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">Architektur verständlich in Sequenzen</h2>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              Die Vorschau strukturiert die vorhandene CAPITAL-AI Architektur in kurze Lernsequenzen.
              Video-Renderings werden erst nach erfolgreichem Social-Media-Engine-Completion-Gate als erzeugte Medien veröffentlicht.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'BYOK · Key → Vault → Provider',
                note: 'Private Credentials, same-origin BFF, Vault-Grenze und read-only Provider-Kontext.',
                href: '/dokumentation',
                tag: 'SECURITY ARCHITECTURE',
              },
              {
                title: 'MARKET · Provider → CAPITAL_FACTS → Replay',
                note: 'Von Provider-Observation über immutable Evidence und PubAck bis zum deterministischen Replay.',
                href: '/marketscreener/dokumentation',
                tag: 'MARKET DATA',
              },
              {
                title: 'Scoring · Features → Snapshot → Shadow',
                note: 'Feature-Berechnung, PipelineSnapshot, Score-Eligibility und die Trennung von Shadow und Production.',
                href: '/architecture',
                tag: 'SCORING CONTRACT',
              },
            ].map((video) => (
              <article key={video.title} className="overflow-hidden rounded-2xl border border-slate-800 bg-[#071022]">
                <div className="relative flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_55%),#030712]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                    <PlayCircle className="h-7 w-7" />
                  </div>
                  <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/50 px-2 py-1 font-mono text-[9px] text-slate-300">
                    {video.tag}
                  </span>
                  <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 font-mono text-[9px] text-amber-300">
                    PREVIEW · VIDEO NOCH NICHT GERENDERT
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-black text-white">{video.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{video.note}</p>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.(video.href)}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-200"
                  >
                    Architektur-Dokumentation öffnen <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] leading-relaxed text-amber-100">
            Social-Media-Engine Status: BLOCKED_RUNTIME_NOT_MIGRATED. Diese Karten sind deshalb eine UI-Vorschau und keine behauptete Video-/Renderer-Evidence.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: INTERACTIVE QUIZ & SKILL-CHECK                             */}
      {/* ========================================================================= */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/15 via-[#0d1530] to-emerald-500/15 border border-purple-500/40">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-400" />
              <span>Quant &amp; Trader Skill-Check</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Testen Sie Ihr Wissen über fundamentale Finanzkennzahlen, Latenzarchitektur und BaFin-Regularien.
            </p>
          </div>

          {!accessLoaded ? (
            <div className="p-8 rounded-xl bg-[#090e21] border border-slate-800 text-center text-xs text-slate-300 max-w-md mx-auto">
              Lernzugang wird serverseitig geprüft…
            </div>
          ) : !authenticated ? (
            <div className="p-8 rounded-xl bg-[#090e21] border border-purple-400/30 text-center space-y-4 max-w-md mx-auto">
              <Award className="w-12 h-12 text-purple-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Anmeldung für den Skill-Check erforderlich</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Der kostenlose Quiz-Versuch wird pro Benutzerkonto serverseitig genau einmal vergeben.
              </p>
              <button type="button" onClick={onNavigateLogin} className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 cursor-pointer">
                Anmelden
              </button>
            </div>
          ) : !quizStarted && !entitled && quizPreviouslyUsed ? (
            <div className="p-8 rounded-xl bg-[#090e21] border border-amber-400/30 text-center space-y-4 max-w-md mx-auto">
              <Award className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Kostenloser Skill-Check bereits verwendet</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Der kostenlose Quiz-Versuch kann einmal genutzt werden. Das Market-Vocabulary-Paket schaltet Quant / Pro und den erweiterten Lernzugang für {formatVocabularyPrice()} frei.
              </p>
              <button type="button" onClick={() => setActiveTab('glossar')} className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 cursor-pointer">
                Vocabulary-Paket ansehen
              </button>
            </div>
          ) : !quizStarted ? (
            <div className="p-8 rounded-xl bg-[#090e21] border border-purple-400/30 text-center space-y-4 max-w-md mx-auto">
              <Award className="w-12 h-12 text-purple-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">{entitled ? 'Skill-Check starten' : 'Ein kostenloser Skill-Check'}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {entitled
                  ? 'Ihr Vocabulary-Entitlement ist aktiv. Der Skill-Check kann erneut gestartet werden.'
                  : 'Mit Start wird Ihr einmaliger kostenloser Quiz-Versuch serverseitig für dieses Benutzerkonto verbraucht.'}
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
                  Vocabulary-Paket für {formatVocabularyPrice()} ansehen
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
