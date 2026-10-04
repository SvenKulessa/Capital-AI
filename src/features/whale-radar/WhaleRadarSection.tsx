import React from 'react';
import type { MarketAsset, MainCategory } from '../../entities/market/model';
import { DataUnavailable } from '../../shared/ui/DataUnavailable';
export const WhaleRadarSection: React.FC<{ onOpenTerminal?: () => void; onOpenTelegram?: () => void; onSelectAsset?: (symbol: string) => void }> = () => <DataUnavailable title="Whale Radar" required="vollständige On-Chain-Transaktionen oder lizenzierte institutionelle Flows mit belegten Entitäten" id="whale-radar-section" />;
