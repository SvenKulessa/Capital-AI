import { evaluateInventory } from '../../../packages/legal-policy-core/index.mjs';

export function usageClassForDependency(dependency, repositoryConfig = {}) {
  const scope = String(dependency.scope ?? 'unknown').toLowerCase();
  const configured = repositoryConfig.scopeUsageClasses?.[scope];
  if (configured) return configured;
  if (scope === 'development') return 'BUILD_ONLY';
  return repositoryConfig.defaultUsageClass ?? null;
}

export function dependencyDiffToInventory({ dependencies, repository, sourceSha, repositoryConfig = {} }) {
  const components = dependencies
    .filter((dependency) => dependency.change_type !== 'removed')
    .map((dependency) => ({
      component: dependency.name,
      exactVersion: dependency.version ?? null,
      artifactIdentity: dependency.package_url ?? null,
      licenseExpression: dependency.license ?? null,
      usageClass: usageClassForDependency(dependency, repositoryConfig),
      modified: false,
      evidenceRefs: dependency.source_repository_url ? [dependency.source_repository_url] : [],
    }));
  return { subject: repository, sourceSha, components };
}

export function spdxSbomToInventory({ sbom, repository, sourceSha, repositoryConfig = {} }) {
  const document = sbom?.sbom ?? sbom;
  const packages = Array.isArray(document?.packages) ? document.packages : [];
  const usageClass = repositoryConfig.sbomUsageClass ?? repositoryConfig.defaultUsageClass ?? null;
  const components = packages
    .filter((pkg) => pkg?.SPDXID !== 'SPDXRef-Repository' && pkg?.name !== repository)
    .map((pkg) => {
      const purl = (pkg.externalRefs ?? []).find((ref) => String(ref.referenceType).toLowerCase() === 'purl')?.referenceLocator ?? null;
      const declared = pkg.licenseDeclared && pkg.licenseDeclared !== 'NOASSERTION' ? pkg.licenseDeclared : null;
      const concluded = pkg.licenseConcluded && pkg.licenseConcluded !== 'NOASSERTION' ? pkg.licenseConcluded : null;
      return {
        component: pkg.name ?? pkg.SPDXID ?? 'unknown',
        exactVersion: pkg.versionInfo ?? null,
        artifactIdentity: purl,
        licenseExpression: declared ?? concluded,
        usageClass,
        modified: false,
        evidenceRefs: purl ? [purl] : [],
      };
    });
  return { subject: repository, sourceSha, components };
}

export function sbomBindsToSource(sbom, sourceSha) {
  if (!sourceSha) return false;
  const document = sbom?.sbom ?? sbom;
  const packages = Array.isArray(document?.packages) ? document.packages : [];
  const repositoryPackage = packages.find((pkg) => pkg?.SPDXID === 'SPDXRef-Repository');
  if (!repositoryPackage) return false;
  if (repositoryPackage.versionInfo === sourceSha) return true;
  return (repositoryPackage.externalRefs ?? []).some((ref) => String(ref.referenceLocator ?? '').endsWith(`@${sourceSha}`));
}

export function evaluateDependencyDiff(args, policy) {
  return evaluateInventory(dependencyDiffToInventory(args), policy);
}

export function evaluateSpdxSbom(args, policy) {
  return evaluateInventory(spdxSbomToInventory(args), policy);
}
