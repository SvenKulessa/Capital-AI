import React from 'react';
import { UnavailableModal } from '../../shared/ui/DataUnavailable';
export const WhaleRadarModal: React.FC<{ isOpen: boolean; onClose: () => void; onSelectAsset?: (symbol: string) => void }> = ({ isOpen, onClose }) => isOpen ? <UnavailableModal title="Whale Radar" required="belegte Transaktionen, Wallet-Zuordnung und Flow-Validierung" onClose={onClose} /> : null;
