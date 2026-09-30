import React from 'react';
import type { PipelineDefinition } from '../../contracts/pipeline';
import { ProviderStatusDashboard } from '../ProviderStatusDashboard';
interface PipelineTerminalDrawerProps { pipeline: PipelineDefinition; isRunning: boolean; onToggleRun: () => void; }
export const PipelineTerminalDrawer: React.FC<PipelineTerminalDrawerProps> = ({ pipeline }) => <div className="border border-slate-800 rounded-2xl p-4 text-white">
 <h3 className="font-bold mb-3">{pipeline.name} · Datenaufnahme</h3><ProviderStatusDashboard />
 <p className="text-sm text-slate-400 mt-3">Die Konfiguration ist kein Ausführungsnachweis. Kein simuliertes Trading, Quorum oder Messwert. Quotes werden ausschließlich vom Backend aufgenommen.</p>
</div>;
