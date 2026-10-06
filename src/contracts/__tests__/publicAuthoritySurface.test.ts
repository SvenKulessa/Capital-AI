import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const surfaces = [
  {
    path: 'src/components/TokenomicsPage.tsx',
    forbidden: [
      /100\.000\.000/,
      /Initialer Umlaufbestand/,
      /25% aller SaaS/i,
      /Staking APY:\s*\d/i,
      /0xcA91A18d098e987cFe67a14e9182390fFe9B2026/i,
    ],
  },
  {
    path: 'src/platform/analytics/useRouteAnalytics.ts',
    forbidden: [
      /100M Hard Cap/i,
      /25% Revenue Buyback/i,
      /Staking-Tiers für Sub-45ms/i,
    ],
  },
] as const;

test('active public tokenomics surfaces contain no unadmitted economic or contract claims', () => {
  for (const surface of surfaces) {
    const content = readFileSync(surface.path, 'utf8');
    for (const pattern of surface.forbidden) {
      assert.equal(pattern.test(content), false, surface.path + ' contains blocked public claim: ' + pattern.source);
    }
  }
});
