/**
 * Plan independent post-merge draft PRs while preserving source provenance.
 * Roadmap uses 10-PR milestones, News uses 20-PR milestones.
 * No network, repository mutation, or publish authority.
 */
function checked(scope, number, date) {
  if (typeof number !== 'string' || typeof date !== 'string') throw new Error('INVALID_MILESTONE_INPUT_' + scope);
  if (!number && !date) return null;
  if (!/^[1-9][0-9]{0,7}$/.test(number) || !/^[0-9]{8}$/.test(date)) {
    throw new Error('INVALID_MILESTONE_IDENTITY_' + scope);
  }
  const day = date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6, 8);
  const parsed = new Date(day + 'T00:00:00.000Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
    throw new Error('INVALID_MILESTONE_DATE_' + scope);
  }
  return { scope, number, date };
}

export function planMilestoneDrafts({ roadmapNumber = '', roadmapDate = '', newsNumber = '', newsDate = '' } = {}) {
  const roadmap = checked('roadmap', roadmapNumber, roadmapDate);
  const news = checked('news', newsNumber, newsDate);
  if (roadmap && news && roadmap.number === news.number && roadmap.date === news.date) {
    return [{ scope: 'combined', number: roadmap.number, date: roadmap.date }];
  }
  return [roadmap, news].filter(Boolean);
}

if (process.argv[1]?.endsWith('/merge-milestone-pr-plan.mjs')) {
  try {
    const plans = planMilestoneDrafts({
      roadmapNumber: process.env.ROADMAP_NUMBER ?? '',
      roadmapDate: process.env.ROADMAP_DATE ?? '',
      newsNumber: process.env.NEWS_NUMBER ?? '',
      newsDate: process.env.NEWS_DATE ?? '',
    });
    for (const plan of plans) process.stdout.write([plan.scope, plan.number, plan.date].join('|') + '\n');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
