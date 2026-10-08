import React from 'react';
import { DataUnavailable } from '../../shared/ui/DataUnavailable';
const WhaleIntelligencePanel = React.lazy(() => import('../analysis/MarketIntelligencePanels').then(m => ({ default: m.WhaleIntelligencePanel })));
import { analysisUiEnabled } from '../analysis/analysisUiFlags';
export const WhaleRadarSection: React.FC<{ onOpenTerminal?: () => void; onOpenTelegram?: () => void; onSelectAsset?: (symbol: string) => void }> = ({ onOpenTerminal }) =>
  analysisUiEnabled('whales') ? <React.Suspense fallback={<p role="status" className="p-5 text-slate-300">Flow-Ansicht wird geladen …</p>}><WhaleIntelligencePanel onOpenTerminal={onOpenTerminal} /></React.Suspense> :
    <DataUnavailable title="Whale Radar" required="vollständige On-Chain-Transaktionen oder lizenzierte institutionelle Flows mit belegten Entitäten" id="whale-radar-section" />;
