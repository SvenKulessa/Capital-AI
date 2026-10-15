# Mergeable Integration – Quizzes Tab

**Status:** COMPONENTS_READY – Portal integration requires precise patch on full file

## Exact changes for LearningPortalPage.tsx (from main)

1. Add after HubNavigationPanel import:
```ts
import { QuizzesTab } from './QuizzesTab';
```

2. Update type and array:
```ts
export type LearningPortalTab = 'glossar' | 'flashcards' | 'guides' | 'patterns' | 'videos' | 'quiz' | 'quizzes' | 'news' | 'kontakt' | 'simulator';
const LEARNING_TABS: readonly LearningPortalTab[] = ['glossar', 'flashcards', 'guides', 'patterns', 'videos', 'quiz', 'quizzes', 'news', 'kontakt', 'simulator'];
```

3. In breadcrumb:
```tsx
{activeTab === 'quizzes' && 'Quizzes · Skill-Checks'}
```

4. After simulator render:
```tsx
{activeTab === 'quizzes' && <QuizzesTab entitled={entitled} />}
```

## HeroBuddy.tsx
Add import and Notiz action that opens BuddyStickyNotes panel (local only).

**QuizzesTab.tsx and BuddyStickyNotes.tsx are complete and mergeable.**

These changes keep the existing logic intact and are the minimal path to a mergeable PR under AGENTS.md.
