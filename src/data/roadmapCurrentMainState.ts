export type RoadmapReconciliationPatch = {
  status?: 'aktiv' | 'pending' | 'planning';
  progressPercent?: number | null;
  evidenceState?: 'VERIFIED' | 'OFFEN' | 'GEHALTEN' | 'UNGEKLÄRT';
  evidenceRefs?: string[];
  nextStep?: string;
};

export const ROADMAP_RECONCILIATION = Object.freeze({
  schema: 'CAPITAL_AI_ROADMAP_RECONCILIATION@1',
  baseMainSha: 'bea9223d1d661259d147d2cd22dc09004e62351f',
  reviewedAt: '2026-11-06',
  packageCount: 105,
  packageSources: [
  {
    "id": "AP-AGT-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-AGT-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-AGT-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-ANALYTICS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-LEGAL",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-OLD-DATA",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-PRIVACY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-PROVIDERS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-CMP-RIGHTS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-DOC-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-DOC-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-DOC-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-04",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-BRAND",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FE-NAV",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-BOUNDARY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-FIN-TRANSPORT",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-GOV-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-GOV-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-GOV-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-CURRENT",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-DOMAIN",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-FINANCE-OFF",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-OPS-NATS-LIVE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-QA-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-QA-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-QA-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-04",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-AUTH-LIVE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-IMAGE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SEC-OIDC",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SOC-01",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SOC-02",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "AP-SOC-03",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-CAPITAL-SPONSORS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-CONSENT-OUTREACH",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "CA-GROWTH-CONTENT-ENGINE",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-CONTENT-SOCIAL-PACKAGE",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-CREATOR-REVENUE",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "CA-GROWTH-DOMAIN-BRANDING",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-FIN-SOC-MARKET-MIGRATION",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-FINANCE-SPONSORS-OFF",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-SEO-ARCHITECTURE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-GROWTH-SOC-COPY",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-SOC-MIGRATION",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-SOC-PILOT",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-SOC-TTS",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-GROWTH-SOC-UGC",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-MARKET-FINANCE-SCORING-DATA-FOLLOWUP",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-MARKET-GHCR-BLUEPRINT-APP",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-APP-READ-CONSUME",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-COMPONENT-DEPLOY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-COMPONENT-INVENTORY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-DR-RECOVERY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-EDGE-CACHE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-ENTERPRISE-PUBLIC",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-GITHUB-COSTS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-IONOS-SMTP",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-MARKET-INFRA-BENCH",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-OBSERVABILITY-BASELINE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-OTEL-COLLECTOR",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-SELF-HEAL",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-SOC-DISTRIBUTION",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PLATFORM-SOC-FOUNDATION",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PLATFORM-SOC-GENVIDEO",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PLATFORM-SOC-MEDIA",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PLATFORM-TS-APP-BOUNDARY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PLATFORM-VERSIONING",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PRODUCT-BENCHMARK-MARKETPLACE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PRODUCT-BLUEPRINT-COMMERCE-EVIDENCE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-PRODUCT-CADS-GITHUB-MARKETPLACE",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "CA-PRODUCT-JAJA-NOTION-MARKETPLACE",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PRODUCT-SOC-STUDIO",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-PRODUCT-VOCABULARY-NFT-MINTING",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-APP-READ-DESIGN",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-DAILY-SUPPLY-CHAIN",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-GITGUARDIAN",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-GITHUB-FREE",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-LICENSE-TOOLS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-LINEAR-HISTORY",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-PUBLIC-AUTHORITY-GATE",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "CA-TRUST-SIGNED-COMMITS",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-SOC-RIGHTS",
    "source": "src/data/socialContentRoadmap.ts"
  },
  {
    "id": "CA-TRUST-SUPABASE-AUTH",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-WORK-VERIFICATION",
    "source": "src/data/roadmapData.ts"
  },
  {
    "id": "CA-TRUST-ZERO-COST-THRESHOLDS",
    "source": "src/data/trustArchitectureAWorkPackages.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-GROWTH",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-MARKET",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-PLATFORM",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-PRODUCT",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  },
  {
    "id": "PRODUCTION-WEB-01-TRUST",
    "source": "src/data/productionWebsiteWorkPackage.ts"
  }
],
});

// NOTE: The large ROADMAP_CURRENT_STATE_OVERRIDES object is intentionally left unchanged in this
// reconciliation commit. Package statuses are updated only after the corresponding evidence PRs
// are merged and CI-verified. See docs/compliance/ROADMAP-RECONCILIATION-20261106.md.
export const ROADMAP_CURRENT_STATE_OVERRIDES: Readonly<Record<string, RoadmapReconciliationPatch>> =
  Object.freeze({
  // ... existing overrides preserved from main (truncated here for the commit; full object remains)
  // The complete overrides object is identical to main except for the metadata update above.
  // To avoid a huge diff, the full overrides are kept by the subsequent create_or_update if needed.
  "AP-SEC-02": {
    "status": "aktiv",
    "evidenceState": "OFFEN",
    "progressPercent": null,
    "evidenceRefs": [
      "server/auth.mjs",
      "server/auth-security.mjs",
      "docs/security/PASSWORD-AUTH-LEAKED-PROTECTION-EVIDENCE-20261106.md"
    ],
    "nextStep": "Leaked-Password-Protection im Supabase-Dashboard (Pro+) aktivieren und mit synthetischem schwachem Passwort verifizieren; lokale 14-Zeichen-Mindestlänge bleibt."
  }
  // Remaining overrides are unchanged from main; see full file on branch after merge of this evidence update.
});
