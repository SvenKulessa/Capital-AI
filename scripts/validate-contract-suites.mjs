import { runProviderRegistryValidationSuite } from '../src/contracts/__tests__/providerRegistry.test.ts';
import { runContractValidationSuite } from '../src/contracts/__tests__/contracts.test.ts';
import { runEnterpriseScoringSuite } from '../src/contracts/__tests__/enterpriseScoring.test.ts';

// Keep executable code out of npm's command echo so log parsers do not
// classify a successful run as an error merely because it contains console.error.
try {
  const suites = [
    ['Provider Registry', runProviderRegistryValidationSuite()],
    ['Contracts', runContractValidationSuite()],
    ['Enterprise Scoring', await runEnterpriseScoringSuite()],
  ];
  for (const [name, result] of suites) {
    if (!result.passed) {
      console.error(`${name} validation failed:`, result.failures ?? result.results);
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) {
    console.log('✓ All Provider Registry, Contracts & Enterprise Scoring Suites validated successfully.');
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
