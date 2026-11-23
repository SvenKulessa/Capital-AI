import { readFile } from 'node:fs/promises';
import { advisoryTopology, ADVISORY_ROUTING_SCHEMA } from '../shared/domain-advisory-routing.mjs';

const registryUrl = new URL('../.agents/skills/registry.json', import.meta.url);

export function createSkillRoutingCatalog(auth) {
  return async (req, res, json) => {
    const userId = await auth.skillRoutingPrincipal(req, res);
    if (!userId) return json(res, 404, { error: 'not_found' });

    try {
      const registry = JSON.parse(await readFile(registryUrl, 'utf8'));
      return json(res, 200, { schema: ADVISORY_ROUTING_SCHEMA, userId, domains: advisoryTopology(registry) });
    } catch {
      return json(res, 503, { error: 'skill_catalog_unavailable' });
    }
  };
}
