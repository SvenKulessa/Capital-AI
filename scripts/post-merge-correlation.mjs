import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ACTIONS = Object.freeze({
  NO_ACTION: "NO_ACTION",
  CORRELATE_ONLY: "CORRELATE_ONLY",
  SYNC_REQUIRED: "SYNC_REQUIRED",
  REPAIR_CANDIDATE: "REPAIR_CANDIDATE",
  MANUAL_REVIEW_REQUIRED: "MANUAL_REVIEW_REQUIRED",
});

export const DOCUMENTATION_ACTIONS = Object.freeze({
  NO_ACTION: "NO_ACTION",
  PR_PROPOSAL_CANDIDATE: "PR_PROPOSAL_CANDIDATE",
  MANUAL_REVIEW_REQUIRED: "MANUAL_REVIEW_REQUIRED",
});

const DOCUMENTATION_FORBIDDEN_EXACT = new Set([
  "AGENTS.md",
  "Dockerfile",
  "Dockerfile.security",
  "package.json",
  "package-lock.json",
]);
const DOCUMENTATION_FORBIDDEN_PREFIXES = [
  ".github/",
  "contracts/",
  "deploy/",
  "docs/security/",
  "server/",
  "supabase/",
];

const HIGH_RISK_PREFIXES = [
  ".github/workflows/",
  "deploy/",
  "server/auth",
  "supabase/migrations/",
  "contracts/",
  "docs/security/",
];
const HIGH_RISK_EXACT = new Set([
  "AGENTS.md",
  "Dockerfile",
  "Dockerfile.security",
  "package.json",
  "package-lock.json",
]);
const LOW_RISK_REPAIR = [
  /^generated\//,
  /^documentary\//,
  /^src\/data\/roadmapData\.ts$/,
  /^docs\/.*\.md$/,
];

function uniq(values) {
  return [...new Set((values || []).map(String).filter(Boolean))].sort();
}

function intersects(a, b) {
  const set = new Set(a);
  return b.filter(value => set.has(value));
}

export function classifyFiles(files) {
  const list = uniq(files);
  const hit = predicate => list.some(predicate);
  return {
    dependency: hit(f => f === "package.json" || f === "package-lock.json"),
    container: hit(f => f === "Dockerfile" || f === ".dockerignore" || f === "Dockerfile.security" || f.startsWith("deploy/")),
    workflow: hit(f => f.startsWith(".github/workflows/")),
    contract: hit(f => f === "AGENTS.md" || f.startsWith("contracts/") || f.startsWith("shared/")),
    securityEvidence: hit(f => f.startsWith("docs/security/") || f.startsWith("security-reports/")),
    runtime: hit(f => f.startsWith("server/") || f.startsWith("supabase/migrations/")),
    product: hit(f => f.startsWith("src/")),
    generated: hit(f => f.startsWith("generated/") || f.startsWith("documentary/")),
    natsAuthority: hit(f => ["deploy/Dockerfile.nats", "deploy/nats-entrypoint.sh", "deploy/nats-server.conf"].includes(f)),
  };
}

function isHighRisk(files) {
  return files.some(file => HIGH_RISK_EXACT.has(file) || HIGH_RISK_PREFIXES.some(prefix => file.startsWith(prefix)));
}

function isDeterministicRepairScope(files) {
  return files.length > 0 && files.every(file => LOW_RISK_REPAIR.some(pattern => pattern.test(file)));
}

function impactOverlap(mergedImpact, prImpact) {
  const keys = Object.keys(mergedImpact).filter(key => key !== "natsAuthority");
  return keys.filter(key => mergedImpact[key] && prImpact[key]);
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function classifyOpenPr({ mergedFiles, mainSha, mergedPr, pr, patternState = {} }) {
  const prFiles = uniq(pr.files);
  const merged = uniq(mergedFiles);
  const exactOverlap = intersects(merged, prFiles);
  const mergedImpact = classifyFiles(merged);
  const prImpact = classifyFiles(prFiles);
  const semanticOverlap = impactOverlap(mergedImpact, prImpact);
  const behindBy = Number(pr.behindBy || 0);
  const affected = exactOverlap.length > 0 || semanticOverlap.length > 0;
  const highRisk = isHighRisk(exactOverlap.length ? exactOverlap : prFiles.filter(file =>
    semanticOverlap.some(key => classifyFiles([file])[key])
  ));
  const deterministicRepair = affected && isDeterministicRepairScope(exactOverlap.length ? exactOverlap : prFiles);
  const patternId = deterministicRepair ? "DETERMINISTIC_POST_MERGE_REPAIR@1" : null;
  const fixFingerprint = patternId ? fingerprint({ patternId, semanticOverlap, exactOverlap }) : null;
  const state = patternId ? patternState[fixFingerprint] || {} : {};
  const positiveValidationCount = Number(state.positiveValidationCount || 0);
  const promoted = positiveValidationCount >= 3 && state.promotionState === "PROMOTED";

  let action = ACTIONS.NO_ACTION;
  const reasons = [];

  if (!affected) {
    if (behindBy > 0) {
      action = ACTIONS.CORRELATE_ONLY;
      reasons.push("BRANCH_BEHIND_WITHOUT_RELEVANT_OVERLAP");
    } else {
      reasons.push("NO_RELEVANT_OVERLAP");
    }
  } else if (highRisk) {
    action = ACTIONS.MANUAL_REVIEW_REQUIRED;
    reasons.push("HIGH_RISK_OR_GOVERNANCE_BOUNDARY_OVERLAP");
  } else if (deterministicRepair && promoted) {
    action = ACTIONS.REPAIR_CANDIDATE;
    reasons.push("PROMOTED_LOW_RISK_REPAIR_PATTERN");
  } else if (behindBy > 0) {
    action = ACTIONS.SYNC_REQUIRED;
    reasons.push(deterministicRepair ? "LOW_RISK_PATTERN_NOT_YET_PROMOTED" : "RELEVANT_OVERLAP_AND_BRANCH_BEHIND");
  } else {
    action = ACTIONS.CORRELATE_ONLY;
    reasons.push("RELEVANT_OVERLAP_WITH_CURRENT_BASE");
  }

  const validate3 = {
    V1_INPUT_IDENTITY: Boolean(mainSha && pr.headSha && pr.number),
    V2_IMPACT_CORRELATION: action === ACTIONS.NO_ACTION || affected || behindBy > 0,
    V3_REPRODUCIBLE_CLASSIFICATION: Boolean(fingerprint({ merged, prFiles, behindBy, action })),
  };
  const approve5 = {
    A1_DETECT: Object.values(validate3).every(Boolean),
    A2_CORRELATE: action !== null,
    A3_CLASSIFY: Object.values(ACTIONS).includes(action),
    A4_REMEDIATE: action !== ACTIONS.REPAIR_CANDIDATE || promoted,
    A5_VERIFY: action === ACTIONS.NO_ACTION || action === ACTIONS.CORRELATE_ONLY || Boolean(pr.requiredChecksRevalidated),
  };

  return {
    prNumber: Number(pr.number),
    title: pr.title || null,
    headSha: pr.headSha || null,
    baseSha: pr.baseSha || null,
    behindBy,
    aheadBy: Number(pr.aheadBy || 0),
    affected,
    exactOverlap,
    semanticOverlap,
    mergedImpact,
    prImpact,
    action,
    reasons,
    repair: {
      patternId,
      fixFingerprint,
      positiveValidationCount,
      promotionState: promoted ? "PROMOTED" : "OBSERVE_ONLY",
      autoMutationAllowed: action === ACTIONS.REPAIR_CANDIDATE && promoted,
    },
    validate3,
    approve5,
    fiveStageComplete: Object.values(approve5).every(Boolean),
    policy: {
      deploy: false,
      productionMutation: false,
      natsHeadOnlyRedeploy: false,
      preserveNewerSecurityEvidence: true,
      autoSyncUnpromotedPatterns: false,
    },
  };
}

function unsafeDocumentationPath(file) {
  return DOCUMENTATION_FORBIDDEN_EXACT.has(file)
    || DOCUMENTATION_FORBIDDEN_PREFIXES.some(prefix => file.startsWith(prefix));
}

export function classifyDocumentationRepair({ mainSha, plan }) {
  const findingsCount = Number(plan?.findingsCount || 0);
  if (!plan || findingsCount === 0) {
    return {
      action: DOCUMENTATION_ACTIONS.NO_ACTION,
      expectedMainSha: mainSha || null,
      findingsCount,
      repairFingerprint: plan?.repairFingerprint || null,
      prOnly: true,
      autoMerge: false,
      productionAuthority: false,
      directMainMutation: false,
      reasons: ["NO_ELIGIBLE_DOCUMENTATION_DRIFT"],
    };
  }

  const operations = Array.isArray(plan.operations) ? plan.operations : [];
  const unsafePaths = operations.map(operation => String(operation.path || "")).filter(unsafeDocumentationPath);
  const policySafe = plan.policy?.mode === "PR_ONLY"
    && plan.policy?.autoMerge === false
    && plan.policy?.productionAuthority === false
    && plan.policy?.directMainMutation === false;
  const expectedMainMatches = Boolean(mainSha && plan.expectedMainSha === mainSha);
  const promoted = plan.promotion?.promoted === true;
  const cleanPlan = plan.eligible === true
    && Array.isArray(plan.blockers)
    && plan.blockers.length === 0
    && operations.length === findingsCount;

  const reasons = [];
  if (!expectedMainMatches) reasons.push("EXPECTED_MAIN_SHA_MISMATCH");
  if (!policySafe) reasons.push("DOCUMENTATION_POLICY_NOT_PR_ONLY");
  if (!promoted) reasons.push("DOCUMENTATION_PATTERN_NOT_PROMOTED");
  if (!cleanPlan) reasons.push("DOCUMENTATION_REPAIR_PLAN_NOT_ELIGIBLE");
  if (unsafePaths.length) reasons.push("DOCUMENTATION_HIGH_RISK_PATH");

  const action = reasons.length === 0
    ? DOCUMENTATION_ACTIONS.PR_PROPOSAL_CANDIDATE
    : DOCUMENTATION_ACTIONS.MANUAL_REVIEW_REQUIRED;

  return {
    action,
    expectedMainSha: plan.expectedMainSha || null,
    findingsCount,
    repairFingerprint: plan.repairFingerprint || null,
    unsafePaths,
    prOnly: true,
    autoMerge: false,
    productionAuthority: false,
    directMainMutation: false,
    reasons,
  };
}

export function buildCorrelation(input) {
  const mergedFiles = uniq(input.files);
  const mergedImpact = classifyFiles(mergedFiles);
  const documentationRepair = classifyDocumentationRepair({
    mainSha: input.mainSha,
    plan: input.documentationRepairPlan || null,
  });
  const openPrs = (input.openPrs || [])
    .filter(pr => Number(pr.number) !== Number(input.mergedPr))
    .map(pr => classifyOpenPr({
      mergedFiles,
      mainSha: input.mainSha,
      mergedPr: input.mergedPr,
      pr,
      patternState: input.patternState || {},
    }))
    .sort((a, b) => a.prNumber - b.prNumber);

  const summary = {
    totalOpenPrs: openPrs.length,
    noAction: openPrs.filter(pr => pr.action === ACTIONS.NO_ACTION).length,
    correlateOnly: openPrs.filter(pr => pr.action === ACTIONS.CORRELATE_ONLY).length,
    syncRequired: openPrs.filter(pr => pr.action === ACTIONS.SYNC_REQUIRED).length,
    repairCandidate: openPrs.filter(pr => pr.action === ACTIONS.REPAIR_CANDIDATE).length,
    manualReviewRequired: openPrs.filter(pr => pr.action === ACTIONS.MANUAL_REVIEW_REQUIRED).length,
    documentationRepairCandidate: documentationRepair.action === DOCUMENTATION_ACTIONS.PR_PROPOSAL_CANDIDATE ? 1 : 0,
    documentationManualReview: documentationRepair.action === DOCUMENTATION_ACTIONS.MANUAL_REVIEW_REQUIRED ? 1 : 0,
  };

  return {
    schema: "POST_MERGE_CORRELATION@2",
    supplyChainSchema: "CAPITAL_AI_SH_SUPPLY_CHAIN@1",
    mainSha: input.mainSha,
    mergedPr: Number(input.mergedPr),
    mergedFiles,
    mergedImpact,
    required: openPrs.some(pr => pr.action !== ACTIONS.NO_ACTION)
      || documentationRepair.action !== DOCUMENTATION_ACTIONS.NO_ACTION,
    rule3: {
      minimumIndependentPositiveValidationCycles: 3,
      promotionRequiresSameFixFingerprint: true,
      repeatedSameRunCountsOnce: true,
    },
    rule5: {
      stages: ["DETECT", "CORRELATE", "CLASSIFY", "REMEDIATE", "VERIFY"],
      allStagesRequiredForAutonomousMutation: true,
    },
    openPrs,
    documentationRepair,
    summary,
    globalPolicy: {
      autoMutationDefault: false,
      autoMutationOnlyForPromotedLowRiskPatterns: true,
      secretsAuthDnsBillingBranchProtectionLicenseApproval: "MANUAL_REVIEW_REQUIRED",
      deploy: false,
      productionHandoff: false,
      natsHeadOnlyRedeploy: false,
      documentationRepairMode: "PR_ONLY",
      documentationAutoMerge: false,
      documentationProductionAuthority: false,
      documentationExpectedMainShaRequired: true,
    },
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: node scripts/post-merge-correlation.mjs <event.json>");
  const input = JSON.parse(fs.readFileSync(file, "utf8"));
  process.stdout.write(JSON.stringify(buildCorrelation(input), null, 2) + "\n");
}
