import test from 'node:test';
import assert from 'node:assert/strict';
import { renderEditorialStatusGraphic } from '../../src/platform/SocialMediaEngine/Branding/EditorialStatusGraphicRenderer.mjs';

const input = {
  format: 'landscape', eyebrow: 'TEST ARTICLE', title: 'A factual status graphic', subtitle: 'Three reviewed states',
  note: 'Synthetic test data', sourceLabel: 'Synthetic source', altText: 'Three synthetic states.',
  rows: [
    { title: 'Design', lines: ['Available'] },
    { title: 'Pilot', lines: ['Planned', 'Conditions apply'] },
    { title: 'Delivery', lines: ['Not evidenced'] },
  ],
};

test('offline renderer produces deterministic, dimensioned PNGs with accessible vector source', async () => {
  for (const [format, width, height] of [['landscape', 1440, 960], ['portrait', 1080, 1350]]) {
    const first = await renderEditorialStatusGraphic({ ...input, format });
    const second = await renderEditorialStatusGraphic({ ...input, format });
    assert.deepEqual(first.png, second.png);
    assert.equal(first.png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(first.png.readUInt32BE(16), width);
    assert.equal(first.png.readUInt32BE(20), height);
    assert.match(first.svg, /aria-labelledby="title description"/);
    assert.match(first.svg, /LicenseRef-CapitalAI-Owned/);
    assert.doesNotMatch(first.svg, /AKASH|<image|<script|<foreignObject|href=/);
  }
});

test('source strings cannot insert executable markup or external images', async () => {
  const result = await renderEditorialStatusGraphic({ ...input, title: '<script>alert("x")</script>' });
  assert.match(result.svg, /&lt;script&gt;/);
  assert.doesNotMatch(result.svg, /<script/);
  await assert.rejects(renderEditorialStatusGraphic({ ...input, rows: [] }), /INPUT_INVALID/);
  await assert.rejects(renderEditorialStatusGraphic({ ...input, rows: [{ title: 'Bad', lines: null }, ...input.rows.slice(1)] }), /ROWS_INVALID/);
  await assert.rejects(renderEditorialStatusGraphic({ ...input, format: 'remote-svg' }), /INPUT_INVALID/);
});

 
// Independent, offline source/asset evidence checks. No remote requests or admissions.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const readRepo = path => readFileSync(new URL('../../' + path, import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const evidencePath = 'docs/growth/drafts/akash-20261121/source-review-v1.json';
const draftEvidence = JSON.parse(readRepo(evidencePath));
const akashManifest = JSON.parse(readRepo('docs/growth/drafts/akash-20261120/manifest.json'));

function validateAkashDraft(evidence, manifest) {
  assert.equal(evidence.contractVersion, 'CAPITAL_AI_AKASH_SOURCE_REVIEW@1');
  assert.equal(evidence.status, 'DRAFT_ONLY');
  assert.equal(evidence.source.historicalRawSourceAvailable, false);
  assert.equal(evidence.source.historicalSourceDigestRecomputed, false);
  assert.equal(evidence.source.currentRawSourceSha256, null);
  assert.equal(evidence.source.historicalByteComparison, 'NOT_PROVEN');
  assert.equal(evidence.source.vendorStatus, 'NOT_LIVE');
  assert.equal(evidence.source.vendorPrimaryUrl, 'https://akash.network/blog/introducing-akash-compute-forwards/');
  assert.equal(evidence.source.vendorStatusUrl, 'https://forwards.akash.network/status');
  assert.equal(evidence.source.comparisonScope, 'FACTUAL_SEMANTICS_ONLY_NOT_BYTE_IDENTITY');
  assert.equal(evidence.rights.sourceArticleCommercialGrant, 'NOT_PROVEN');
  assert.equal(evidence.rights.copyingSourceArticleOrExternalGraphics, 'BLOCKED');
  assert.equal(evidence.rights.editorialReview, 'REVIEW_REQUIRED');
  assert.equal(evidence.rights.publicPublishAllowed, false);
  assert.equal(evidence.quality.publicationDisposition, 'BLOCKED');
  assert.equal(digest(evidence.source.observedFactsGerman), evidence.source.observedFactsSha256);
  assert.equal(manifest.sourceUrl, evidence.source.url);
  assert.equal(manifest.sourceDigest, evidence.source.historicalSourceDigest);
  assert.equal(manifest.reviewedStoryDigest, evidence.firstParty.reviewedStoryDigest);
  assert.equal(manifest.sourceSha, evidence.firstParty.graphicSourceCommitSha);
  assert.equal(manifest.contentDigest, evidence.firstParty.expectedContentDigest);
  assert.equal(digest(JSON.stringify({
    contentId: manifest.assets[0].contentId,
    reviewedStoryDigest: manifest.reviewedStoryDigest,
    sourceUrl: manifest.sourceUrl,
    sourceDigest: manifest.sourceDigest,
    recipe: evidence.firstParty.recipe,
  })), manifest.contentDigest);
  assert.equal(manifest.sourceRights, 'NOT_PROVEN');
  assert.equal(manifest.editorialReview, 'REVIEW_REQUIRED');
  assert.equal(manifest.publicPublishAllowed, false);
  assert.equal(manifest.plan.publication.publicPublishAllowed, false);
  assert.equal(manifest.assets.length, 2);
  assert.equal(manifest.graphicOwnerGrants.length, manifest.assets.length);
  assert.equal(digest(readRepo(evidence.firstParty.graphicLicenseRef)), manifest.licenseDocumentSha256);
  for (const asset of manifest.assets) {
    assert.equal(asset.sourceDigest, manifest.sourceDigest);
    assert.equal(asset.contentDigest, manifest.contentDigest);
    assert.equal(asset.thirdPartyAssets, false);
    assert.equal(digest(readRepo(evidence.firstParty.graphicsPath + '/' + asset.assetId + '.png')), asset.sha256);
    const grant = manifest.graphicOwnerGrants.find(item => item.asset.assetId === asset.assetId);
    assert.ok(grant && grant.decision === 'LICENSED');
    assert.equal(grant.asset.sha256, asset.sha256);
    assert.equal(grant.authorizationEvidenceRef, evidence.firstParty.graphicLicenseRef);
    assert.ok(grant.allowedChannels.includes('WEBSITE'));
  }
  return true;
}

test('Akash source provenance remains draft-only; recompute own content and PNG digests', () => {
  assert.equal(validateAkashDraft(draftEvidence, akashManifest), true);
  const preview = readRepo(draftEvidence.firstParty.previewPath).toString('utf8');
  const renderer = readRepo(draftEvidence.firstParty.rendererPath).toString('utf8');
  assert.ok(preview.includes(akashManifest.sourceUrl));
  assert.ok(preview.includes('Redaktioneller Entwurf'));
  assert.ok(preview.includes('akash-portrait.png') && preview.includes('akash-landscape.png'));
  assert.ok(renderer.includes(akashManifest.sourceDigest));
  assert.ok(renderer.includes('publicPublishAllowed: false'));
});

test('Akash negative cases reject forged source identity, summary, grants and publication status', () => {
  const tamper = (changeEvidence, changeManifest) => {
    const evidence = structuredClone(draftEvidence);
    const manifest = structuredClone(akashManifest);
    changeEvidence?.(evidence);
    changeManifest?.(manifest);
    assert.throws(() => validateAkashDraft(evidence, manifest));
  };
  tamper(e => { e.status = 'READY'; });
  tamper(e => { e.rights.publicPublishAllowed = true; });
  tamper(e => { e.rights.sourceArticleCommercialGrant = 'APPROVED'; });
  tamper(e => { e.source.historicalByteComparison = 'VERIFIED'; });
  tamper(e => { e.source.vendorStatus = 'LIVE'; });
  tamper(e => { e.source.observedFactsGerman += ' verändert'; });
  tamper(null, m => { m.sourceDigest = '0'.repeat(64); });
  tamper(null, m => { m.assets[0].sha256 = '0'.repeat(64); });
  tamper(null, m => { m.plan.publication.publicPublishAllowed = true; });
});


// Independent QUALITY checks: repository evidence and official-source references are
// reviewed as untrusted inputs, not as permissions or editorial approvals.
const gitBlobSha = bytes => createHash('sha1')
  .update('blob ' + bytes.length + '\0')
  .update(bytes).digest('hex');

const expectedTrustDecisions = Object.freeze({
  'solana-article-reuse': ['NOT_PROVEN', 'BLOCKED'],
  'solana-crawler': ['NOT_PROVEN', 'BLOCKED'],
  'solana-mark': ['NOT_PROVEN', 'BLOCKED'],
  'akash-article-reuse': ['NOT_PROVEN', 'BLOCKED'],
  'akash-mark': ['NOT_PROVEN', 'BLOCKED'],
  'external-media': ['NOT_PROVEN', 'BLOCKED'],
  'original-png-graphics': ['VERIFIED_SCOPED', 'DRAFT_ASSET_ONLY'],
  'plain-link': ['REVIEW_REQUIRED', 'DRAFT_ONLY'],
  'independent-editorial-text': ['REVIEW_REQUIRED', 'DRAFT_ONLY'],
  'claim-and-timing': ['VERIFIED_SCOPED', 'FACTS_FOR_PRIVATE_REVIEW_ONLY'],
  'font-licenses': ['VERIFIED_SCOPED', 'DRAFT_ASSET_ONLY'],
  'public-home-and-social': ['NOT_PROVEN', 'BLOCKED'],
});
const expectedTrustUrls = Object.freeze({
  'solana-article': 'https://solana.com/news/day-2-at-breakpoint-2026-ai-compute-and-britains-tokenisation-push',
  'solana-tos': 'https://solana.com/de/tos',
  'solana-brand': 'https://solana.com/de/branding',
  'akash-blog': 'https://akash.network/blog/introducing-akash-compute-forwards/',
  'akash-status': 'https://forwards.akash.network/status',
  'akash-press': 'https://forwards.akash.network/press',
  'akash-brand': 'https://akash.network/brand/resources/',
  'akash-homenode-tos': 'https://homenode.akash.network/terms-of-service',
});

function reviewAkashRightsMatrix(evidence, manifest) {
  const matrix = evidence.trustMatrix;
  assert.equal(evidence.status, 'DRAFT_ONLY');
  assert.equal(matrix.contractVersion, 'CAPITAL_AI_AKASH_TRUST_MATRIX@1');
  assert.equal(matrix.authority, 'EVIDENCE_ONLY_NOT_RIGHTSHOLDER_OR_EDITORIAL_APPROVAL');
  assert.equal(matrix.legalOpinion, false);
  assert.equal(matrix.publicPublishAllowed, false);
  assert.equal(matrix.qualityReview.role, 'INDEPENDENT_QUALITY_NOT_OWNER_APPROVAL');
  assert.equal(matrix.qualityReview.status, 'PENDING_CURRENT_HEAD_CI');
  assert.equal(matrix.qualityReview.noSelfApproval, true);
  assert.equal(matrix.qualityReview.testsMustRejectUntrustedApprovals, true);
  assert.ok(matrix.qualityReview.negativeCases.length >= 10);
  assert.match(matrix.scopeWarnings.join(' '), /CC BY 4\.0/);
  assert.match(matrix.scopeWarnings.join(' '), /does not automatically cover/);
  assert.equal(matrix.revisionBindings.reviewedPrHeadBeforeMatrix, '7f95deb569730bc30b95d063e068d16618e5187a');
  assert.equal(matrix.revisionBindings.historicalSolanaArticleRawBytes, 'NOT_PROVEN');
  assert.equal(matrix.revisionBindings.historicalSourceDigest, evidence.source.historicalSourceDigest);
  assert.equal(matrix.revisionBindings.manifest.contentDigest, manifest.contentDigest);
  for (const key of ['manifest', 'preview', 'originalGraphicLicense', 'publicRightsLedger']) {
    const binding = matrix.revisionBindings[key];
    assert.match(binding.path, /^(docs|src)\/[a-zA-Z0-9/._-]+$/);
    assert.equal(gitBlobSha(readRepo(binding.path)), binding.gitBlobSha);
  }
  assert.equal(matrix.revisionBindings.manifest.path, evidence.firstParty.manifestPath);
  assert.equal(matrix.revisionBindings.originalGraphicLicense.sha256, manifest.licenseDocumentSha256);
  assert.equal(matrix.revisionBindings.publicRightsLedger.approvedPublicReviews, 0);
  const ledger = readRepo(matrix.revisionBindings.publicRightsLedger.path).toString('utf8');
  assert.match(ledger, /HOME_PUBLIC_DISPLAY_REVIEWS\s*=\s*Object\.freeze\(\[\]\)/);
  assert.deepEqual(manifest.socialPackage.approvals, []);
  assert.deepEqual(manifest.socialPackage.deliveries, []);
  assert.equal(manifest.publicPublishAllowed, false);
  assert.equal(manifest.plan.publication.publicPublishAllowed, false);
  assert.equal(manifest.sourceRights, 'NOT_PROVEN');
  assert.equal(manifest.editorialReview, 'REVIEW_REQUIRED');
  assert.deepEqual(matrix.sources.map(s => s.id).sort(), Object.keys(expectedTrustUrls).sort());
  for (const source of matrix.sources) {
    assert.equal(source.url, expectedTrustUrls[source.id]);
    assert.equal(source.rawPageBytesArchived, false);
  }
  const ids = matrix.rows.map(r => r.id);
  assert.deepEqual(ids.slice().sort(), Object.keys(expectedTrustDecisions).sort());
  assert.equal(new Set(ids).size, ids.length);
  for (const row of matrix.rows) {
    assert.deepEqual([row.rightsEvidence, row.operationalDecision], expectedTrustDecisions[row.id]);
    assert.ok(row.holder && row.useCase && row.rationale && row.nextProof);
    assert.ok(row.sourceIds.every(id => Object.hasOwn(expectedTrustUrls, id)));
  }
  const expectedGraphics = matrix.revisionBindings.graphics;
  assert.equal(expectedGraphics.length, 2);
  for (const graphic of expectedGraphics) {
    const asset = manifest.assets.find(a => graphic.path.endsWith('/' + a.assetId + '.png'));
    assert.ok(asset);
    assert.equal(asset.sha256, graphic.sha256);
    assert.equal(digest(readRepo(graphic.path)), graphic.sha256);
    const grant = manifest.graphicOwnerGrants.find(g => g.grantId === graphic.grantId);
    assert.ok(grant);
    assert.equal(grant.decision, 'LICENSED');
    assert.equal(grant.asset.sha256, graphic.sha256);
  }
  const preview = readRepo(matrix.revisionBindings.preview.path).toString('utf8');
  assert.match(preview, /Redaktioneller Entwurf/);
  assert.match(preview, /Verfügbarkeit und tatsächliche Lieferungen sind gesondert nachzuweisen/);
  assert.doesNotMatch(preview, /<(?:img|source)[^>]+https?:\/\//i);
  return true;
}

test('independent QUALITY checks source rights, fixed blobs and no public admissions', () => {
  assert.equal(reviewAkashRightsMatrix(draftEvidence, akashManifest), true);
});

test('independent QUALITY rejects fabricated licenses, approval, status and tampered assets', () => {
  const tamper = (changeEvidence, changeManifest) => {
    const evidence = structuredClone(draftEvidence);
    const manifest = structuredClone(akashManifest);
    changeEvidence?.(evidence);
    changeManifest?.(manifest);
    assert.throws(() => reviewAkashRightsMatrix(evidence, manifest));
  };
  tamper(e => { e.trustMatrix.publicPublishAllowed = true; });
  tamper(e => { e.trustMatrix.authority = 'OWNER_APPROVED'; });
  tamper(e => { e.trustMatrix.legalOpinion = true; });
  tamper(e => { e.trustMatrix.rows.find(r => r.id === 'solana-article-reuse').rightsEvidence = 'APPROVED'; });
  tamper(e => { e.trustMatrix.rows.find(r => r.id === 'akash-article-reuse').operationalDecision = 'PUBLICATION_ALLOWED'; });
  tamper(e => { e.trustMatrix.rows.find(r => r.id === 'solana-mark').operationalDecision = 'DRAFT_ASSET_ONLY'; });
  tamper(e => { e.trustMatrix.rows.find(r => r.id === 'plain-link').rightsEvidence = 'VERIFIED_SCOPED'; });
  tamper(e => { e.trustMatrix.rows.find(r => r.id === 'original-png-graphics').operationalDecision = 'PUBLICATION_ALLOWED'; });
  tamper(e => { e.trustMatrix.rows.find(r => r.id === 'claim-and-timing').rightsEvidence = 'APPROVED'; });
  tamper(e => { e.trustMatrix.sources.find(s => s.id === 'solana-tos').url = 'https://attacker.invalid/tos'; });
  tamper(e => { e.trustMatrix.revisionBindings.preview.gitBlobSha = '0'.repeat(40); });
  tamper(e => { e.trustMatrix.revisionBindings.manifest.contentDigest = '0'.repeat(64); });
  tamper(e => { e.trustMatrix.revisionBindings.graphics[0].sha256 = '0'.repeat(64); });
  tamper(e => { e.trustMatrix.revisionBindings.historicalSolanaArticleRawBytes = 'VERIFIED'; });
  tamper(e => { e.trustMatrix.qualityReview.noSelfApproval = false; });
  tamper(null, m => { m.socialPackage.approvals.push({ decision: 'APPROVED' }); });
  tamper(null, m => { m.plan.publication.publicPublishAllowed = true; });
});


// Used for review evidence only; this validator never issues grants or
// authorizes publication. No new CI gate is introduced.
function validateAkashEditorialRightsCandidate(evidence, manifest) {
  const pkg = evidence.reviewPackage;
  assert.equal(pkg.contractVersion, 'CAPITAL_AI_AKASH_EDITORIAL_RIGHTS_CANDIDATE@1');
  assert.equal(pkg.status, 'REVIEW_READY_NOT_APPROVED');
  assert.equal(pkg.scope.site, 'CAPITAL-AI');
  assert.equal(pkg.scope.publicationChannel, 'WEBSITE');
  assert.equal(pkg.scope.textUse, 'INDEPENDENT_GERMAN_FACTUAL_SUMMARY');
  assert.equal(pkg.scope.mediaUse, 'EXACT_SHA256_FIRST_PARTY_PNG_ONLY');
  assert.ok(pkg.scope.rightsExclusions.includes('THIRD_PARTY_ARTICLE_REPUBLICATION'));
  assert.ok(pkg.scope.rightsExclusions.includes('BULK_SCRAPING'));
  assert.ok(pkg.scope.rightsExclusions.includes('THIRD_PARTY_LOGOS'));
  assert.ok(pkg.scope.additionalChannels.every(channel => channel.status === 'NOT_APPROVED_SEPARATE_EDITION_REQUIRED'));
  const { headline, teaser, paragraphs, disclaimer, sourceNote, altText } = pkg.editorial;
  assert.ok(headline.length > 40 && teaser.length > 40);
  assert.equal(paragraphs.length, 4);
  assert.ok(paragraphs.every(value => typeof value === 'string' && value.length > 80));
  assert.ok(paragraphs.join(' ').includes('Anfang 2027'));
  assert.ok(paragraphs.join(' ').includes('März') && paragraphs.join(' ').includes('April'));
  assert.match(paragraphs.join(' '), /keine bestätigte Marktöffnung/);
  assert.match(disclaimer, /keine Anlage-/);
  assert.ok(altText.length > 40);
  assert.equal(pkg.editorial.sha256, digest(JSON.stringify({
    headline, teaser, paragraphs, disclaimer, sourceNote, altText,
  })));
  assert.equal(pkg.editorial.digestBasis, 'SHA256_UTF8_JSON_STRINGIFY_EDITORIAL_STORY_FIELDS_IN_ORDER');
  assert.equal(pkg.editorial.titleScope, 'DRAFT_NOT_PUBLIC');
  assert.deepEqual(pkg.factualReferences.map(x => x.url), [
    'https://akash.network/blog/introducing-akash-compute-forwards/',
    'https://forwards.akash.network/status',
    'https://solana.com/news/day-2-at-breakpoint-2026-ai-compute-and-britains-tokenisation-push',
  ]);
  assert.ok(pkg.factualReferences.every(x => x.use.endsWith('FACT_CROSSCHECK_ONLY') && x.reproductionGrant === 'NOT_PROVEN'));
  const rights = pkg.rightsDossier;
  assert.equal(rights.status, 'SCOPE_DEFINED_NO_EXTERNAL_ARTICLE_LICENSE');
  assert.equal(rights.articleText.origin, 'NEW_CAPITAL_AI_DRAFT');
  assert.equal(rights.articleText.thirdPartyTextCopied, false);
  assert.equal(rights.articleText.thirdPartyQuoteBytesUsed, false);
  assert.equal(rights.articleText.legalAssessment, 'REVIEW_REQUIRED');
  assert.equal(rights.articleText.editorialOwnerGrant, 'PENDING_OWNER_DECISION');
  assert.equal(rights.originalGraphics.licenseDocumentSha256, manifest.licenseDocumentSha256);
  assert.equal(rights.originalGraphics.sourceAndBrandRightsGranted, false);
  assert.equal(rights.originalGraphics.assets.length, 2);
  for (const asset of rights.originalGraphics.assets) {
    const item = manifest.assets.find(a => a.assetId === asset.assetId);
    const grant = manifest.graphicOwnerGrants.find(g => g.grantId === asset.grantId);
    assert.ok(item && grant);
    assert.equal(asset.sha256, item.sha256);
    assert.equal(asset.sourceContentDigest, item.contentDigest);
    assert.equal(asset.licenseRef, grant.authorizationEvidenceRef);
    assert.equal(grant.asset.sha256, asset.sha256);
    assert.ok(grant.allowedChannels.includes(asset.allowedChannel));
    assert.equal(asset.allowedChannel, 'WEBSITE');
    assert.equal(asset.origin, 'FIRST_PARTY_TEMPLATE');
  }
  assert.equal(rights.fonts.license, 'SIL Open Font License 1.1');
  assert.equal(rights.legalOpinionProvided, false);
  assert.equal(rights.thirdPartyLogosAllowed, false);
  assert.equal(rights.thirdPartyArticleReuseAllowed, false);
  assert.equal(rights.sourceScrapingAllowed, false);
  assert.equal(rights.neutralAttributionLink, 'REVIEW_REQUIRED_NO_AUTOMATIC_LINK_PERMISSION');
  assert.equal(rights.missingRightsEvidence.length, 2);
  assert.ok(rights.sourceTerms.every(t => t.grant === 'NOT_PROVEN'));
  assert.equal(pkg.approvalReceipts.editorial.decision, 'PENDING_OWNER');
  assert.equal(pkg.approvalReceipts.editorial.receiptId, null);
  assert.equal(pkg.approvalReceipts.editorial.approvedEditorialSha256, null);
  assert.deepEqual(pkg.approvalReceipts.editorial.approvedAssetSha256s, []);
  assert.equal(pkg.approvalReceipts.rights.decision, 'PENDING_SCOPE_REVIEW');
  assert.equal(pkg.approvalReceipts.rights.licenseEvidenceRef, null);
  assert.equal(pkg.approvalReceipts.publication.decision, 'NOT_AUTHORIZED');
  assert.equal(pkg.approvalReceipts.publication.publishedUrl, null);
  assert.equal(pkg.approvalReceipts.publication.readback, null);
  assert.equal(pkg.decision, 'BLOCKED_FOR_PUBLIC_PUBLICATION');
  assert.equal(pkg.publicPublishAllowed, false);
  assert.equal(evidence.rights.publicPublishAllowed, false);
  assert.equal(manifest.publicPublishAllowed, false);
  assert.equal(pkg.noExternalContactOrPermissionClaim, true);
  return true;
}

test('use-scoped Akash rights packet binds draft text and first-party graphics without rights admission', () => {
  assert.equal(validateAkashEditorialRightsCandidate(draftEvidence, akashManifest), true);
});

test('editorial rights packet fails closed for forged approvals, text changes, assets, links and publishing', () => {
  const alter = fn => {
    const next = structuredClone(draftEvidence);
    fn(next.reviewPackage);
    assert.throws(() => validateAkashEditorialRightsCandidate(next, akashManifest));
  };
  alter(p => { p.editorial.headline = 'Autorisierter Handel ist gestartet'; });
  alter(p => { p.editorial.paragraphs[0] += ' Echtbetrieb behauptet.'; });
  alter(p => { p.editorial.sha256 = '0'.repeat(64); });
  alter(p => { p.rightsDossier.originalGraphics.assets[0].sha256 = '0'.repeat(64); });
  alter(p => { p.rightsDossier.originalGraphics.assets[0].grantId = 'fake-grant'; });
  alter(p => { p.rightsDossier.articleText.thirdPartyTextCopied = true; });
  alter(p => { p.rightsDossier.thirdPartyArticleReuseAllowed = true; });
  alter(p => { p.rightsDossier.sourceScrapingAllowed = true; });
  alter(p => { p.rightsDossier.sourceTerms[0].grant = 'LICENSED'; });
  alter(p => { p.factualReferences[1].url = 'https://unverified.invalid/status'; });
  alter(p => { p.scope.additionalChannels[0].status = 'APPROVED'; });
  alter(p => { p.approvalReceipts.editorial.decision = 'APPROVED'; });
  alter(p => { p.approvalReceipts.rights.decision = 'APPROVED'; });
  alter(p => { p.approvalReceipts.publication.decision = 'AUTHORIZED'; });
  alter(p => { p.publicPublishAllowed = true; });
});
