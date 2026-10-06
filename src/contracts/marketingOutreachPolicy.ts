export const MARKETING_OUTREACH_POLICY_VERSION='MARKETING_OUTREACH_POLICY@1' as const;
export const MARKETING_FROM_ADDRESS='support@capital-ai.online' as const;
export interface MarketingEmailEligibilityInput{explicitConsent:boolean;consentEvidenceRef?:string;existingCustomer:boolean;addressObtainedDuringSale:boolean;ownSimilarProductsOnly:boolean;objected:boolean;optOutNoticeAtCollection:boolean;optOutNoticeInMessage:boolean;suppressed:boolean;}
export function isMarketingEmailEligible(i:MarketingEmailEligibilityInput):boolean{
 if(i.suppressed||i.objected)return false; if(i.explicitConsent)return Boolean(i.consentEvidenceRef)&&i.optOutNoticeInMessage;
 return i.existingCustomer&&i.addressObtainedDuringSale&&i.ownSimilarProductsOnly&&i.optOutNoticeAtCollection&&i.optOutNoticeInMessage;
}
