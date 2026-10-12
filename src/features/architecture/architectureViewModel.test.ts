import test from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_50_COMPONENTS } from '../../contracts/analysisComponentRegistry';
import { STUDIO_BLUEPRINTS } from '../../data/studioData';
import { BLUEPRINT_EVIDENCE_CONTRACTS } from '../../data/blueprintEvidenceContracts';
import { BLUEPRINT_DELIVERY_POLICY } from '../../data/blueprintDeliveryPolicy';
import {
  ARCHITECTURE_CATALOGS, ARCHITECTURE_PRODUCT_PATHS,
  architectureCatalogUrl, filterArchitectureCatalogs,
  ARCHITECTURE_BLUEPRINTS, ARCHITECTURE_COMPONENTS,
  ARCHITECTURE_LESSONS, DATA_FLOW_STAGES, blueprintEvidenceLabel,
  componentEvidenceLabel, filterArchitectureBlueprints, filterArchitectureComponents,
} from './architectureViewModel';

test('architecture hub reuses canonical registries without shadow inventories', () => {
  assert.equal(ARCHITECTURE_COMPONENTS, CANONICAL_50_COMPONENTS);
  assert.equal(ARCHITECTURE_BLUEPRINTS, STUDIO_BLUEPRINTS);
  assert.equal(ARCHITECTURE_COMPONENTS.length, 50);
  assert.equal(ARCHITECTURE_BLUEPRINTS.length, 7);
  assert.equal(new Set(ARCHITECTURE_COMPONENTS.map(item => item.componentId)).size, ARCHITECTURE_COMPONENTS.length);
  assert.equal(new Set(ARCHITECTURE_BLUEPRINTS.map(item => item.id)).size, ARCHITECTURE_BLUEPRINTS.length);
});

test('blueprint selection filters without leaking full source and gates every delivery', () => {
  assert.deepEqual(filterArchitectureBlueprints('no-such-blueprint'), []);
  for (const blueprint of STUDIO_BLUEPRINTS) {
    assert.ok(filterArchitectureBlueprints(blueprint.id.toUpperCase()).some(item => item.id === blueprint.id));
    assert.equal(blueprintEvidenceLabel(blueprint.id), 'BLOCKED');
    assert.ok(BLUEPRINT_EVIDENCE_CONTRACTS[blueprint.id]?.requirements.length);
  }
  assert.equal(blueprintEvidenceLabel('UNLISTED'), 'NOT_PROVEN');
});

test('component search, domain filtering and runtime evidence remain fail-closed', () => {
  const sample = ARCHITECTURE_COMPONENTS[0];
  assert.ok(filterArchitectureComponents(sample.componentId, 'all').some(item => item.componentId === sample.componentId));
  assert.ok(filterArchitectureComponents('', sample.domain).every(item => item.domain === sample.domain));
  assert.deepEqual(filterArchitectureComponents('absent feature/provider', 'all'), []);
  for (const component of ARCHITECTURE_COMPONENTS) {
    assert.ok(['BLOCKED', 'NOT_PROVEN'].includes(componentEvidenceLabel(component)));
    assert.equal(componentEvidenceLabel(component), component.status === 'blocked' ? 'BLOCKED' : 'NOT_PROVEN');
    assert.ok(component.outputContract.length > 0);
    assert.ok(component.calculationVersion.length > 0);
  }
});

test('data flow and educational journey explicitly separate provider, scores and evidence', () => {
  assert.deepEqual(DATA_FLOW_STAGES.map(stage => stage.id), ['provider', 'data', 'analysis', 'scoring', 'evidence']);
  assert.equal(ARCHITECTURE_LESSONS.length, 4);
  assert.equal(new Set(ARCHITECTURE_LESSONS.map(lesson => lesson.id)).size, 4);
});

test('catalog navigation exposes exactly the five public markdown deliverables without arbitrary URLs', () => {
  assert.deepEqual(ARCHITECTURE_CATALOGS.map(item => item.file), [
    'COMPONENT-CATALOG.md', 'PROVIDER-CATALOG.md', 'SCORING-CATALOG.md',
    'BLUEPRINT-CATALOG.md', 'LEARNING-PATHS.md',
  ]);
  assert.deepEqual(filterArchitectureCatalogs('not-in-catalog'), []);
  assert.deepEqual(filterArchitectureCatalogs('rechte').map(item => item.id), ['providers']);
  assert.equal(filterArchitectureCatalogs('').length, 5);
  for (const entry of ARCHITECTURE_CATALOGS) {
    assert.equal(
      architectureCatalogUrl(entry.file),
      `https://github.com/SvenKulessa/Capital-AI/blob/main/CAPITAL-AI-MARKET/${entry.file}`,
    );
  }
  assert.equal(architectureCatalogUrl('../../private.env'), null);
});

test('offer funnel never becomes an entitlement, blueprint delivery or checkout authorization', () => {
  assert.equal(BLUEPRINT_DELIVERY_POLICY.currentCommerceAdmission, false);
  assert.deepEqual(ARCHITECTURE_PRODUCT_PATHS.map(item => item.state), [
    'PUBLIC_EDUCATION', 'SERVER_ENTITLEMENT_REQUIRED', 'DELIVERY_BLOCKED', 'INQUIRY_ONLY',
  ]);
  assert.ok(ARCHITECTURE_PRODUCT_PATHS.every(item => item.path.startsWith('/')));
  assert.ok(ARCHITECTURE_PRODUCT_PATHS.every(item => !item.path.includes('/api/')));
});
