export const vocabularyGameEndpoint = '/api/learning/word-game';

export function vocabularyReview(word: string, known: boolean, swipe: boolean) {
  return { type: 'review', word, result: known ? 'known' : 'missed', swipe, receipt: crypto.randomUUID() } as const;
}
