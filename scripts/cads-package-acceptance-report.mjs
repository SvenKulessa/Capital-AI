import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

function load(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const packageBenchmark = load(process.argv[2] || 'security-reports/cads-package-benchmark.json');
const b2bBenchmark = load(process.argv[3] || 'security-reports/cads-b2b-flow-benchmark.json');
const provenance = load(process.argv[4] || 'security-reports/cads-export-provenance.json');

const technicalPass =
  packageBenchmark.status === 'PASS' &&
  b2bBenchmark.status === 'PASS' &&
  Array.isArray(provenance.files) &&
  provenance.files.length > 0;

const report = {
  schemaVersion: 'CAPITAL_AI_CADS_PACKAGE_ACCEPTANCE@1',
  generatedAt: new Date().toISOString(),
  sourceRepository: 'SvenKulessa/Capital-AI',
  sourceCommit: provenance.sourceCommit,
  functionalContractTests: 'PASS_IF_WORKFLOW_REACHED_THIS_STEP',
  packageBenchmark: packageBenchmark.status,
  b2bFlowBenchmark: b2bBenchmark.status,
  exportProvenance: technicalPass ? 'PASS' : 'FAIL',
  security: {
    packageBoundaryTests: 'PASS_IF_WORKFLOW_REACHED_THIS_STEP',
    parentDockerSecurityGate: 'SEPARATE_REQUIRED_CHECK',
    standaloneArtifactScan: 'REQUIRED_AFTER_EXPORT',
    status: 'NOT_APPROVED_BY_THIS_REPORT',
  },
  licensing: {
    firstPartyBoundary: 'PRESENT',
    thirdPartyNotice: 'PRESENT',
    exactRuntimeSbom: 'REQUIRED_FOR_RELEASE_ARTIFACT',
    status: 'NOT_APPROVED_BY_THIS_REPORT',
  },
  marketplace: {
    organizationOwnedApp: 'EXTERNAL_EVIDENCE_REQUIRED',
    verifiedPublisher: 'EXTERNAL_EVIDENCE_REQUIRED',
    minimumInstallations: 'EXTERNAL_EVIDENCE_REQUIRED',
    financialOnboarding: 'EXTERNAL_EVIDENCE_REQUIRED',
    listingApproval: 'EXTERNAL_EVIDENCE_REQUIRED',
    realBillingE2E: 'EXTERNAL_EVIDENCE_REQUIRED',
    status: 'NOT_APPROVED_BY_THIS_REPORT',
  },
  export: {
    technicalStagingReady: technicalPass,
    organizationRepoCreationAllowedByTechnicalGate: technicalPass,
    productionOrMarketplacePublicationApproved: false,
  },
  status: technicalPass ? 'TECHNICAL_STAGING_PASS' : 'FAIL',
};

const target = process.argv[5] || 'security-reports/cads-package-acceptance.json';
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify(report) + '\n');
if (!technicalPass) process.exitCode = 1;
