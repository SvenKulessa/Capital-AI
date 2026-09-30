export interface CatalogedToolItem {
  id: string;
  tier: string;
  name: string;
  specs: string;
  costEur: number;
  latencyEffect: string;
  bafinRelevance: string;
}

export interface AdvisorRequestPayload {
  prompt: string;
  currentConfig?: {
    analysisFocusId?: string;
    latencyIntervalId?: string;
    providerIds?: string[];
    cachingId?: string;
    evidenceId?: string;
    catalogedInventory?: CatalogedToolItem[];
    totalMonthlyCostEur?: number;
  };
}

export interface AdvisorResponsePayload {
  thoughtProcess: string;
  advice: string;
  inventory: Array<{
    tier: string;
    item: string;
    specs: string;
    costEur: number;
    latencyEffect: string;
    bafinRelevance: string;
  }>;
  totalMonthlyCostEur: number;
  isBudgetCompliant: boolean;
  recommendedConfig?: {
    analysisFocusId: string;
    latencyIntervalId: string;
    providerIds: string[];
    cachingId: string;
    evidenceId: string;
  };
}

