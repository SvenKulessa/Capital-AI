import { lazy, Suspense, useEffect, useState } from 'react';
import { openHeroBuddy } from '../../components/heroBuddyEvents';
import {
  LEARNING_EARTH_ATOMS, LEARNING_EARTH_LESSONS,
  canStartLearningEarth, learningEarthLesson,
} from './learningSimulatorUniverseModel.mjs';

// Load the existing Earth renderer only after explicit, motion-safe user intent.
const HeroEarth3D = lazy(() => import('../../components/HeroEarth3D'));

export function LearningSimulatorUniverseStage() {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [requested, setRequested] = useState(false);
  const [ready, setReady] = useState(false);
  const [lessonId, setLessonId] = useState(LEARNING_EARTH_LESSONS[0].id);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches) { setRequested(false); setReady(false); }
    };
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const showEarth = canStartLearningEarth({ requested, reducedMotion });
  const lesson = learningEarthLesson(lessonId);
  const toggleEarth = () => {
    setReady(false);
    setRequested(previous => !previous);
  };

  return (
    <section
      data-learning-universe-simulator="v1"
      aria-labelledby="learning-universe-sim-title"
      className="learning-sim-universe"
    >
      <div className="learning-sim-universe-copy">
        <p className="learning-sim-universe-eyebrow">CAPITAL-AI UNIVERSE · LEARNING</p>
        <h2 id="learning-universe-sim-title">Risiko verstehen. Szenarien erkunden.</h2>
        <p>Die Erde verbindet die Lernwelten visuell. Berechnet wird ausschließlich mit den
          vorhandenen synthetischen Portfolio-Modellen im Simulator darunter.</p>
        <div className="learning-sim-universe-lessons" role="group" aria-label="Lernthema wählen">
          {LEARNING_EARTH_LESSONS.map(item => (
            <button key={item.id} type="button" className="learning-sim-universe-lesson"
              aria-pressed={item.id === lessonId}
              onClick={() => setLessonId(item.id)}>
              {item.title}
            </button>
          ))}
        </div>
        <div className="learning-sim-universe-detail" aria-live="polite" aria-atomic="true">
          <strong>{lesson.question}</strong>
          <p>{lesson.explanation}</p>
        </div>
        <div className="learning-sim-universe-actions">
          <a href="#sim-title">Zum Portfolio-Simulator</a>
          <button type="button" onClick={openHeroBuddy} aria-label="JaJa Universe Buddy öffnen">
            JaJa Universe Buddy öffnen
          </button>
        </div>
        <p className="learning-sim-universe-disclaimer">Nur Finanzbildung mit Modellwerten.
          Keine Live-Marktdaten, keine Anlageberatung und keine Renditegarantie.</p>
      </div>

      <div className="learning-sim-universe-visual">
        <div className="learning-sim-universe-atoms" aria-hidden="true">
          {LEARNING_EARTH_ATOMS.map(atom => (
            <span key={atom.name} data-universe-atom={atom.name}
              className={'learning-sim-universe-atom learning-sim-universe-atom--' + atom.name} />
          ))}
        </div>
        <div className="learning-sim-universe-earth" aria-label="Dekorative Earth-Visualisierung">
          {!ready && <img src="/branding/universe/hero-universe-globe.webp"
            alt="Stilisierte CAPITAL-AI-Erde mit umlaufenden Lichtbahnen"
            width="480" height="480" loading="lazy" decoding="async" />}
          {showEarth && (
            <Suspense fallback={null}>
              <HeroEarth3D onReadyChange={setReady} />
            </Suspense>
          )}
        </div>
        <p className="learning-sim-universe-visual-status" role="status" aria-live="polite">
          {showEarth
            ? ready ? '3D-Erde aktiv.' : '3D-Erde lädt; die statische Ansicht bleibt verfügbar.'
            : reducedMotion ? 'Statische Ansicht: Bewegung reduziert oder nicht verfügbar.'
              : 'Statische Ansicht aktiv. 3D kann optional gestartet werden.'}
        </p>
        <button type="button" className="learning-sim-universe-earth-toggle"
          aria-pressed={showEarth} disabled={reducedMotion}
          onClick={toggleEarth}>
          {showEarth ? '3D-Erde ausschalten' : '3D-Erde einschalten'}
        </button>
      </div>
    </section>
  );
}
