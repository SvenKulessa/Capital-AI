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

export function evaluateDependencyDiff(args, policy) {
  return evaluateInventory(dependencyDiffToInventory(args), policy);
}
