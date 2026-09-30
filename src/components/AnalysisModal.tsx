import React from 'react';
import type { MarketAsset } from '../types';
import { UnavailableModal } from './DataUnavailable';
export interface AnalysisModalProps { isOpen: boolean; onClose: () => void; initialTab?: 'asset' | 'sector'; initialTicker?: string; initialSectorId?: string; onSelectAsset?: (asset: MarketAsset) => void; }
export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose }) => isOpen ? <UnavailableModal title="Marktanalyse" required="vollständige versionierte Features, Unternehmenszahlen und validierte Eligibility-Gates" onClose={onClose} /> : null;
