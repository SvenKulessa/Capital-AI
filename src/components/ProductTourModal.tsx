import React, { useEffect, useRef, useState } from 'react';
import { X, Play, CheckCircle2, ChevronRight, ArrowRight, Shield, Zap, Globe, Newspaper } from 'lucide-react';
import { motion } from 'motion/react';
import { BrandLogo } from './BrandLogo';

interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAnalysis: () => void;
}

const TOUR_STEPS = [
 {step:1,title:'Learning Hub',desc:'Eine einfache Elite-Vokabelkarte kennenlernen: Backtesting verständlich erklärt.',icon:Globe,color:'text-amber-300',highlight:'Wissen aufbauen'},
 {step:2,title:'Blueprints & Sentiment',desc:'Ein grafischer Sentiment-Tachometer zeigt synthetische Demo-Werte mit Greed-Anzeige. Blueprint-Bundles werden vorbereitet.',icon:Zap,color:'text-cyan-300',highlight:'Katalog & Vorschau'},
 {step:3,title:'Privates Lernfeld',desc:'Begriffe sammeln und im eigenen Tempo üben. Dein persönliches Lernfeld begleitet dich beim Lernen.',icon:Shield,color:'text-emerald-300',highlight:'Methoden verstehen'},
 {step:4,title:'Hero Buddy',desc:'Dein Buddy winkt im Video. Auf der Website begleitet er dich bei Fragen und lässt sich an die gewünschte Bildschirmposition ziehen.',icon:Newspaper,color:'text-pink-300',highlight:'Fragen & entdecken'},
];

export const ProductTourModal: React.FC<ProductTourModalProps> = ({ isOpen, onClose, onStartAnalysis }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], video[controls]') || []);
      const first = buttons[0], last = buttons[buttons.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown',keydown);
    return () => { document.removeEventListener('keydown',keydown); if (previous instanceof HTMLElement) previous.focus(); };
  }, [isOpen]);
  const [activeTab, setActiveTab] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    setActiveTab(current => delta < 0
      ? Math.min(TOUR_STEPS.length - 1, current + 1)
      : Math.max(0, current - 1));
  };

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[activeTab];
  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="tour-title"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="w-full max-w-lg bg-[#070e22] border border-amber-500/30 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto touch-pan-y"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="emblem" size="sm" />
            <div>
              <h3 id="tour-title" className="text-lg font-bold text-white leading-none">Capital-AI Tour</h3>
              <p className="text-xs text-slate-400 mt-1">Learning Hub · Finanzanalyse · Hero Buddy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tour schließen"
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        <video controls muted playsInline preload="none" poster="/learning/videos/capital-ai-tour-thumbnail-1280x720.png" className="mt-4 max-h-80 w-full rounded-xl" aria-label="Capital-AI Tour, 20 Sekunden, ohne Ton">
          <source src="/learning/videos/capital-ai-tour-short-1080x1920.mp4" type="video/mp4" />
          Die Tour zeigt Lernportal, Analysekomponenten, Demo und Hero Buddy.
        </video>
        {/* Step Navigation Dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Schritt ${idx+1}: ${s.title}`}
              aria-current={idx===activeTab ? 'step' : undefined}
              onClick={() => setActiveTab(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeTab === idx ? 'w-8 bg-amber-400' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Interactive Feature Display */}
        <div className="mt-5 p-5 rounded-2xl bg-[#0a122e] border border-slate-700/70 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-3">
            <StepIcon className={`w-7 h-7 ${currentStep.color}`} />
          </div>

          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[11px] font-bold mb-2">
            {currentStep.highlight}
          </span>

          <h4 className="text-xl font-bold text-white mb-2">{currentStep.title}</h4>
          <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
            {currentStep.desc}
          </p>

          <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs">
            <button
              type="button"
              disabled={activeTab === 0}
              onClick={() => setActiveTab((prev) => Math.max(0, prev - 1))}
              className={`px-3 py-1.5 rounded-lg ${activeTab === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-300 hover:text-white'}`}
            >
              Zurück
            </button>
            <span className="text-slate-400 font-mono">
              Schritt {activeTab + 1} von {TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={() => {
                if (activeTab < TOUR_STEPS.length - 1) {
                  setActiveTab((prev) => prev + 1);
                } else {
                  onClose();
                  onStartAnalysis();
                }
              }}
              className="px-3 py-1.5 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-300"
            >
              {activeTab === TOUR_STEPS.length - 1 ? 'Starten' : 'Weiter'}
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onStartAnalysis();
          }}
          className="mt-5 w-full py-3 bg-[#F5B014] hover:bg-amber-300 text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <span>Analyse-Demo öffnen</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
};
