#!/usr/bin/env node
/** Manual sandbox-only REST readback and internal Product2/content binding preview. */
import { readFileSync } from 'node:fs';
import { buildGrowthSalesCrmDraft } from '../../src/contracts/growthSalesCrm.ts';
import { ContentSocialPackageManifestSchema } from '../../src/contracts/contentSocialPackage.ts';
import {
  SalesforceSandboxReadonlyClient, mapApprovedSalesContentToSandboxProduct,
} from '../../server/salesforce/sandbox-readonly.mjs';

function getArgs(argv) {
  if (argv.length !== 2 && argv.length !== 4) throw Error('INVALID_ARGUMENTS');
  if (argv[0] !== '--input' || !argv[1]) throw Error('INVALID_ARGUMENTS');
  if (argv.length === 4 && (argv[2] !== '--approved-manifest' || !argv[3])) {
    throw Error('INVALID_ARGUMENTS');
  }
  return { input: argv[1], approvedManifest: argv[3] ?? null };
}

try {
  const options = getArgs(process.argv.slice(2));
  const bundle = buildGrowthSalesCrmDraft(JSON.parse(readFileSync(options.input, 'utf8')));
  if (options.approvedManifest) {
    if (!bundle.socialPackage) throw Error('SALESFORCE_CONTENT_PLAN_NOT_AVAILABLE');
    const approved = ContentSocialPackageManifestSchema.parse(
      JSON.parse(readFileSync(options.approvedManifest, 'utf8')),
    );
    const generated = bundle.socialPackage;
    if (approved.campaignId !== generated.campaignId || approved.contentId !== generated.contentId
        || approved.sourceSha !== generated.sourceSha || approved.canonicalUrl !== generated.canonicalUrl
        || approved.assets.length !== 1 || approved.assets[0].kind !== 'TEXT'
        || approved.assets[0].assetId !== generated.assets[0].assetId
        || approved.assets[0].sha256 !== generated.assets[0].sha256
        || approved.assets[0].sourceSha !== generated.assets[0].sourceSha) {
      throw Error('SALESFORCE_APPROVED_MANIFEST_IDENTITY_MISMATCH');
    }
    bundle.socialPackage = approved;
  }

  const client = new SalesforceSandboxReadonlyClient({
    instanceUrl: process.env.SALESFORCE_SANDBOX_INSTANCE_URL,
    apiVersion: process.env.SALESFORCE_SANDBOX_API_VERSION,
    accessToken: process.env.SALESFORCE_SANDBOX_ACCESS_TOKEN,
  });
  const readback = await client.readProduct({
    projectId: bundle.crmDraft.product.projectId,
    productId: bundle.crmDraft.product.productId,
    productName: bundle.crmDraft.product.name,
  });
  const contentBinding = readback.status === 'MATCHED' && bundle.socialPackage
    ? mapApprovedSalesContentToSandboxProduct(bundle, readback)
    : { status: 'HOLD_NO_UNIQUE_APPROVED_CONTENT_RECORD', binding: null, writeAllowed: false };

  const output = {
    schema: 'SALESFORCE_SANDBOX_CONTENT_READBACK_RESULT@1',
    orgId: readback.organizationId,
    source: readback.source,
    readbackStatus: readback.status,
    projectId: readback.projectId,
    productId: readback.productId,
    crmProduct2Id: readback.product?.id ?? null,
    productCode: readback.expectedCode,
    providerReadbackSha256: readback.providerReadbackSha256 ?? null,
    fieldMapping: readback.fieldMapping,
    pricebookStatus: readback.pricebookStatus,
    pricebookCount: readback.pricebookEntries.length,
    contentBinding,
    writeAllowed: false,
    commercialRelease: 'HOLD',
  };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
} catch (error) {
  const message = error instanceof Error && /^SALESFORCE_[A-Z_]+$/.test(error.message)
    ? error.message : 'SANDBOX_READBACK_UNAVAILABLE';
  // Never echo bearer tokens, API responses or the contents of input files.
  process.stderr.write('SALESFORCE_SANDBOX_READBACK_BLOCKED=' + message + '\n');
  process.exitCode = 1;
}
