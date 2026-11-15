/**
 * Bridge to the canonical homepage right-holder/Content-Engine contract in PR #739.
 * Until that code and its separately reviewed receipts exist on this branch, deny
 * all new candidate admissions. Never fallback to the legacy score-only selector.
 * No new admission authority, provider I/O, scheduler, or publication.
 */
export async function approvedHomeCandidates(candidates, asOf) {
  if (!Array.isArray(candidates)) throw Error('HOME_CANDIDATES_INVALID');
  if (candidates.length === 0) return [];
  let admission;
  let ledger;
  try {
    admission = await import('../../src/features/home/homeEditorialAdmission.mjs');
    ledger = await import('../../src/features/home/homeEditorialRightsLedger.mjs');
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') return [];
    throw error;
  }
  if (typeof admission?.homeRightsAdmitted !== 'function' ||
      typeof admission?.normalizeHomeStory !== 'function' ||
      !Array.isArray(ledger?.HOME_PUBLIC_DISPLAY_REVIEWS)) return [];
  // The independent ledger, not JSON candidate flags or a scoring result, grants
  // each of story, source and graphic use on the exact reviewed snapshot.
  return candidates
    .map(candidate => admission.normalizeHomeStory(candidate, asOf))
    .filter(candidate => admission.homeRightsAdmitted(candidate, ledger.HOME_PUBLIC_DISPLAY_REVIEWS));
}

/**
 * Writer-side backstop: direct callers cannot bypass the CLI and commit an
 * unreviewed replacement edition using an empty archive index.
 */
export async function assertHomeEditionAdmission(previous, next, asOf = next?.date) {
  if (!Array.isArray(previous?.stories) || !Array.isArray(next?.stories) ||
      previous.stories.length !== 3 || next.stories.length !== 3) throw Error('HOME_EDITION_INVALID');
  if (JSON.stringify(previous) === JSON.stringify(next)) return true;
  const previousById = new Map(previous.stories.map(item => [item.id, item]));
  const additions = next.stories.filter(item => !previousById.has(item.id));
  for (const item of next.stories) {
    const old = previousById.get(item.id);
    if (old && JSON.stringify(old) !== JSON.stringify(item)) throw Error('HOME_EDITION_SNAPSHOT_MUTATION');
  }
  if (additions.length === 0) throw Error('HOME_EDITORIAL_RIGHTS_NOT_ADMITTED');
  const admitted = await approvedHomeCandidates(additions, asOf);
  if (admitted.length !== additions.length) throw Error('HOME_EDITORIAL_RIGHTS_NOT_ADMITTED');
  return true;
}
