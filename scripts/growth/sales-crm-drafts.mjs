#!/usr/bin/env node
/**
 * Local-only CRM product candidate -> canonical Content Engine + CRM draft JSON.
 * Does not send lead/customer data, call providers, access Drive or publish.
 * Usage: node --import tsx scripts/growth/sales-crm-drafts.mjs --input ./candidate.json
 */
import { readFileSync } from 'node:fs';
import { buildGrowthSalesCrmDraft } from '../../src/contracts/growthSalesCrm.ts';

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--input' || !args[1]) {
  process.stderr.write('Usage: node --import tsx scripts/growth/sales-crm-drafts.mjs --input <owner-reviewed-public-product-candidate.json>\n');
  process.exitCode = 2;
} else {
  try {
    const parsed = JSON.parse(readFileSync(args[1], 'utf8'));
    const result = buildGrowthSalesCrmDraft(parsed);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    // Do not log raw input, provider responses or potentially sensitive file content.
    process.stderr.write('CRM_CONTENT_DRAFT_BLOCKED: ' +
      (error instanceof Error && error.message.startsWith('GROWTH_SALES_') ? error.message : 'VALIDATION_OR_INPUT_FAILURE') + '\n');
    process.exitCode = 1;
  }
}
