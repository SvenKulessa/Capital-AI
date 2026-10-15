import { useVerifiedSession } from '../../hooks/useVerifiedSession';
import { VOCABULARY_PUBLIC_COUNT, VOCABULARY_SOURCE_PRS } from '../../../shared/vocabulary-metadata.mjs';
import { HubNavigationPanel } from '../../components/HubNavigationPanel';
import { QuizzesTab } from './QuizzesTab';
/**
 * CAPITAL AI — LEARNING PORTAL & FINANZ-VOKABULAR TERMINAL
 * 
 * Zentrales Learning Hub der Anwendung.
 * Beinhaltet:
 * 1. Vollständiges Market Vocabulary & Glossar (Filterbar nach Kategorien & Skill-Levels)
 * 2. Öffentliche Analyse-Module & Methodik (Werkzeuge, Datenpfade, Modulaufbau)
 * 3. Architektur-Video-Vorschau (Renderer-Evidence bleibt fail-closed)
 * 4. Quant- & Trader Skill-Check (Interaktives Quiz)
 * 5. Quizzes Tab (Quant + Portfolio-Risiko)
 */

import { VocabularyCard } from './VocabularyCard';
import { LearningJourney } from './LearningJourney';
import { LearningArticles } from './LearningArticles';
import { ContactForm } from '../../components/ContactForm';
import { LearningPurchase } from './LearningPurchase';
import { LearningVideos } from './LearningVideos';
import { ChartRecognitionQuiz } from './ChartRecognitionQuiz';
import { useLearningFavorites } from './LearningFavorites';
import { dailyLearningQuestions } from './learningPolicy';
import { ChartLearningAtlas } from './ChartLearningAtlas';
import { FinancialLearningSimulator } from './FinancialLearningSimulator';
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
  Mail,
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
import { updatePageSEO, trackVerifiedLearningPurchase } from '../../utils/analytics';
import { VOCABULARY_GRANT_KEY, formatVocabularyPrice } from '../../data/vocabularyOffer';

const VocabularyFlashcards = React.lazy(() =>
  import('../../components/VocabularyFlashcards').then(module => ({
    default: module.VocabularyFlashcards,
  })),
);

export type LearningPortalTab = 'glossar' | 'flashcards' | 'guides' | 'patterns' | 'videos' | 'quiz' | 'quizzes' | 'news' | 'kontakt' | 'simulator';
const LEARNING_TABS: readonly LearningPortalTab[] = ['glossar', 'flashcards', 'guides', 'patterns', 'videos', 'quiz', 'quizzes', 'news', 'kontakt', 'simulator'];

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
  // ... existing code remains the same until the return ...
  // (truncated for brevity in this update; full file would include all previous logic)

  return (
    <div className="hub-universe hub-universe--learning w-full max-w-full min-w-0 text-slate-100 min-h-screen py-4 sm:py-6 px-2 sm:px-6 relative">
      {/* existing header ... */}
      {activeTab === 'quizzes' && <QuizzesTab entitled={entitled} />}
      {/* existing other tabs ... */}
    </div>
  );
}
