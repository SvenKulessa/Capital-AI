import { z } from 'zod';

export const CommercialLicensedDataLaneSchema = z.object({
  lane: z.literal('COMMERCIAL_LICENSED_DATA'),
  providerId: z.string().min(1),
  intendedCustomerAcquisition: z.literal('VIA_CAPITAL_AI_THIRD_PARTY_PROVIDER'),
  writtenRightsEvidence: z.boolean(),
  applicableEntityBound: z.boolean(),
  datasetScopeVerified: z.boolean(),
  attributionSatisfied: z.boolean(),
  resellerOrSublicenseRightVerified: z.boolean(),
  replayRightVerified: z.boolean(),
  jetStreamRightVerified: z.boolean(),
  backupRestoreRightVerified: z.boolean(),
  deployEligible: z.boolean(),
});

export type CommercialLicensedDataLane = z.infer<typeof CommercialLicensedDataLaneSchema>;

export interface CommercialLicensedDataLaneDecision {
  eligible: boolean;
  reasons: string[];
}

export function evaluateCommercialLicensedDataLane(
  raw: CommercialLicensedDataLane,
): CommercialLicensedDataLaneDecision {
  const lane = CommercialLicensedDataLaneSchema.parse(raw);
  const reasons: string[] = [];

  if (!lane.writtenRightsEvidence) reasons.push('WRITTEN_RIGHTS_EVIDENCE_MISSING');
  if (!lane.applicableEntityBound) reasons.push('APPLICABLE_ENTITY_UNBOUND');
  if (!lane.datasetScopeVerified) reasons.push('DATASET_SCOPE_UNVERIFIED');
  if (!lane.attributionSatisfied) reasons.push('ATTRIBUTION_CONDITION_UNSATISFIED');
  if (!lane.resellerOrSublicenseRightVerified) reasons.push('THIRD_PARTY_RESELLER_OR_SUBLICENSE_RIGHT_UNVERIFIED');
  if (!lane.replayRightVerified) reasons.push('REPLAY_RIGHT_UNVERIFIED');
  if (!lane.jetStreamRightVerified) reasons.push('JETSTREAM_RIGHT_UNVERIFIED');
  if (!lane.backupRestoreRightVerified) reasons.push('BACKUP_RESTORE_RIGHT_UNVERIFIED');
  if (!lane.deployEligible) reasons.push('PROVIDER_DEPLOY_NOT_ELIGIBLE');

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}
