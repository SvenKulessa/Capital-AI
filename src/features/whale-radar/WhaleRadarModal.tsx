import React from 'react';
import { AnalysisDialog } from '../analysis/AnalysisUi';
import { WhaleRadarSection } from './WhaleRadarSection';
export const WhaleRadarModal: React.FC<{ isOpen: boolean; onClose: () => void; onSelectAsset?: (symbol: string) => void }> = ({ isOpen, onClose }) =>
  <AnalysisDialog open={isOpen} onClose={onClose} title="Whale Radar · Flow-Inspector"><WhaleRadarSection /></AnalysisDialog>;
