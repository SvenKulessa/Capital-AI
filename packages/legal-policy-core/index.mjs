export const DECISIONS = Object.freeze({
  ALLOW: 'ALLOW',
  ALLOW_WITH_OBLIGATIONS: 'ALLOW_WITH_OBLIGATIONS',
  LEGAL_REVIEW_REQUIRED: 'LEGAL_REVIEW_REQUIRED',
  BLOCKED: 'BLOCKED',
});

const SEVERITY = new Map([
  [DECISIONS.ALLOW, 0],
  [DECISIONS.ALLOW_WITH_OBLIGATIONS, 1],
  [DECISIONS.LEGAL_REVIEW_REQUIRED, 2],
  [DECISIONS.BLOCKED, 3],
]);

const DISTRIBUTION_CLASSES = new Set(['BUNDLED_FRONTEND', 'DISTRIBUTED_BINARY']);

export function normalizeSpdxExpression(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function expressionTokens(expression) {
  if (!expression) return [];
  return [...new Set(expression
    .replace(/[()]/g, ' ')
    .split(/\s+(?:AND|OR|WITH)\s+|\s+/i)
    .map((token) => token.trim())
    .filter(Boolean))];
}

function findProfile(expression, policy) {
  const tokens = expressionTokens(expression);
  for (const [profileId, profile] of Object.entries(policy.licenseProfiles ?? {})) {
    const licenses = new Set(profile.licenses ?? []);
    if (tokens.length > 0 && tokens.every((token) => licenses.has(token))) {
      return { profileId, profile };
    }
  }
  return null;
}

function applicableObligations(profile, component) {
  const obligations = new Set(profile.obligations ?? []);
  if (DISTRIBUTION_CLASSES.has(component.usageClass)) {
    for (const obligation of profile.distributionObligations ?? []) obligations.add(obligation);
  }
  if (component.modified === true) {
    for (const obligation of profile.modificationObligations ?? []) obligations.add(obligation);
  }
  return [...obligations].sort();
}

function decisionFromProfile(profile, outstanding) {
  if (profile.defaultStatus === DECISIONS.BLOCKED) return DECISIONS.BLOCKED;
  if (profile.defaultStatus === DECISIONS.LEGAL_REVIEW_REQUIRED) return DECISIONS.LEGAL_REVIEW_REQUIRED;
  if (outstanding.length > 0) return DECISIONS.ALLOW_WITH_OBLIGATIONS;
  return DECISIONS.ALLOW;
}

export function evaluateComponent(component, policy) {
  if (!component || typeof component !== 'object') throw new TypeError('component must be an object');
  if (!policy || typeof policy !== 'object') throw new TypeError('policy must be an object');

  const licenseExpression = normalizeSpdxExpression(component.licenseExpression ?? component.license);
  const usageClasses = new Set(policy.usageClasses ?? []);
  const evidenceRefs = Array.isArray(component.evidenceRefs) ? component.evidenceRefs : [];

  if (component.rightsStatus === 'DENIED') {
    return {
      component: component.component ?? component.name ?? 'unknown',
      exactVersion: component.exactVersion ?? component.version ?? null,
      licenseExpression,
      usageClass: component.usageClass ?? null,
      legalStatus: DECISIONS.BLOCKED,
      obligations: [],
      outstandingObligations: [],
      evidenceRefs,
      reasons: ['Explicit rights evidence denies the requested use or distribution.'],
    };
  }

  if (!licenseExpression) {
    return {
      component: component.component ?? component.name ?? 'unknown',
      exactVersion: component.exactVersion ?? component.version ?? null,
      licenseExpression: null,
      usageClass: component.usageClass ?? null,
      legalStatus: DECISIONS.LEGAL_REVIEW_REQUIRED,
      obligations: [],
      outstandingObligations: [],
      evidenceRefs,
      reasons: ['No SPDX license expression is available.'],
    };
  }

  if (!component.usageClass || !usageClasses.has(component.usageClass)) {
    return {
      component: component.component ?? component.name ?? 'unknown',
      exactVersion: component.exactVersion ?? component.version ?? null,
      licenseExpression,
      usageClass: component.usageClass ?? null,
      legalStatus: DECISIONS.LEGAL_REVIEW_REQUIRED,
      obligations: [],
      outstandingObligations: [],
      evidenceRefs,
      reasons: ['Usage/distribution class is missing or unsupported by the selected policy profile.'],
    };
  }

  if ((policy.blockedLicenses ?? []).some((blocked) => expressionTokens(licenseExpression).includes(blocked))) {
    return {
      component: component.component ?? component.name ?? 'unknown',
      exactVersion: component.exactVersion ?? component.version ?? null,
      licenseExpression,
      usageClass: component.usageClass,
      legalStatus: DECISIONS.BLOCKED,
      obligations: [],
      outstandingObligations: [],
      evidenceRefs,
      reasons: ['The selected policy profile explicitly blocks this license.'],
    };
  }

  const match = findProfile(licenseExpression, policy);
  if (!match) {
    return {
      component: component.component ?? component.name ?? 'unknown',
      exactVersion: component.exactVersion ?? component.version ?? null,
      licenseExpression,
      usageClass: component.usageClass,
      legalStatus: DECISIONS.LEGAL_REVIEW_REQUIRED,
      obligations: [],
      outstandingObligations: [],
      evidenceRefs,
      reasons: ['No deterministic rule exists for this SPDX expression in the selected policy profile.'],
    };
  }

  const obligations = applicableObligations(match.profile, component);
  const satisfied = new Set(component.satisfiedObligations ?? []);
  const outstandingObligations = obligations.filter((item) => !satisfied.has(item));
  const legalStatus = decisionFromProfile(match.profile, outstandingObligations);
  const reasons = [];

  if (legalStatus === DECISIONS.LEGAL_REVIEW_REQUIRED) {
    reasons.push(match.profile.reviewReason ?? 'This license family requires legal review under the selected policy profile.');
  } else if (legalStatus === DECISIONS.ALLOW_WITH_OBLIGATIONS) {
    reasons.push('Use is policy-eligible after the listed obligations are evidenced.');
  } else if (legalStatus === DECISIONS.ALLOW) {
    reasons.push('No unresolved obligations remain under the selected policy profile.');
  }

  return {
    component: component.component ?? component.name ?? 'unknown',
    exactVersion: component.exactVersion ?? component.version ?? null,
    artifactIdentity: component.artifactIdentity ?? component.packageUrl ?? null,
    licenseExpression,
    selectedLicense: component.selectedLicense ?? licenseExpression,
    licenseProfile: match.profileId,
    usageClass: component.usageClass,
    distributedTo: component.distributedTo ?? [],
    modified: component.modified ?? null,
    linkingMode: component.linkingMode ?? null,
    obligations,
    outstandingObligations,
    evidenceRefs,
    legalStatus,
    reasons,
  };
}

export function evaluateInventory(inventory, policy) {
  if (!inventory || !Array.isArray(inventory.components)) {
    throw new TypeError('inventory.components must be an array');
  }
  const components = inventory.components.map((component) => evaluateComponent(component, policy));
  let releaseDecision = DECISIONS.ALLOW;
  for (const component of components) {
    if ((SEVERITY.get(component.legalStatus) ?? 99) > (SEVERITY.get(releaseDecision) ?? -1)) {
      releaseDecision = component.legalStatus;
    }
  }
  const counts = Object.fromEntries(Object.values(DECISIONS).map((status) => [status, 0]));
  for (const component of components) counts[component.legalStatus] += 1;

  return {
    schemaVersion: 1,
    policyId: policy.policyId ?? 'UNSPECIFIED',
    subject: inventory.subject ?? null,
    sourceSha: inventory.sourceSha ?? null,
    evaluatedAt: inventory.evaluatedAt ?? new Date().toISOString(),
    releaseDecision,
    decisionEligible: releaseDecision === DECISIONS.ALLOW,
    counts,
    components,
  };
}
