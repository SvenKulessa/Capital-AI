import React, { useEffect, useRef, useState } from 'react';
import { PUBLIC_LEARNING_VIDEO_INVENTORY, admittedPublicLearningVideos } from '../../../shared/seo-video.mjs';
import { LearningComingSoonGraphic } from './LearningComingSoonGraphic';
export const VIDEO_CATEGORIES = ['Architektur', 'Fintech Deepdive', 'Social'] as const;
export type LearningVideo = {
  id: string;
  category: typeof VIDEO_CATEGORIES[number];
  title: string;
  youtubeId: string;
  externalYouTubeId: string;
  publicationState: string;
  visibility: string;
  licenseState: string;
  editorialApproval: string;
  searchEligible: boolean;
  isFreePreview: boolean;
  providerReadbackVerified: boolean;
  providerChannelId: string;
  processingStatus: string;
  embeddable: boolean;
  assetSha256: string;
  providerEvidenceRef: string;
  rightsEvidenceRef: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
};
// One reviewed source for SEO and the UI. Unpublished manifest chapters stay absent.
export const LEARNING_VIDEOS: readonly LearningVideo[] = PUBLIC_LEARNING_VIDEO_INVENTORY;
export function visibleLearningVideos(videos: readonly LearningVideo[]): LearningVideo[] {
  // Preserve the read-only inventory contract while calling the shared JS admission API.
  return admittedPublicLearningVideos([...videos]) as LearningVideo[];
}
function VideoPlayer({ video }: { video: LearningVideo }) {
  const [consent, setConsent] = useState(false);
  return <article id={`video-${video.youtubeId}`} className="overflow-hidden rounded-2xl border border-amber-400/25 bg-[#090e21]">
    <h3 className="p-4 font-bold text-amber-200">{video.title}</h3>
    <p className="px-4 pb-4 text-sm text-slate-300">{video.description}</p>
    <p className="px-4 pb-4 text-sm font-semibold text-amber-200">Kostenlose Vorschau</p>
    {consent ? <iframe className="aspect-video w-full" title={video.title}
      src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`} loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture" allowFullScreen />
      : <div className="space-y-3 p-4 text-sm text-slate-300"><p>Beim Laden verbindet sich dein Browser mit YouTube. Dabei wird deine IP-Adresse übermittelt.</p>
        <button type="button" onClick={() => setConsent(true)} className="min-h-11 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950">YouTube-Video laden</button></div>}
    <a href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="m-4 inline-flex min-h-11 items-center text-sm text-amber-200 underline focus-visible:outline-2 focus-visible:outline-amber-200">Alternativ auf YouTube ansehen (externer Dienst)</a>
  </article>;
}
type MasterclassStage = 'cover' | 'series' | 'episodes';
const FINTECH_CATEGORY = 'Fintech Deepdive';
const FINTECH_COVER = '/learning/videos/fintech-deepdive-universe.webp';
const MASTERCLASS_COVER = '/learning/videos/masterclass-universe.webp';

export function FintechMasterclass({ stage, onNavigate, videos }: {
  stage: MasterclassStage;
  onNavigate: (stage: MasterclassStage) => void;
  videos: readonly LearningVideo[];
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current !== stage) headingRef.current?.focus();
    previousStage.current = stage;
  }, [stage]);
  const episodes = visibleLearningVideos(videos).filter(video => video.category === FINTECH_CATEGORY);
  const backClass = 'inline-flex min-h-11 items-center rounded-lg border border-amber-400/40 px-4 py-2 text-sm font-semibold text-amber-200 focus-visible:outline-2 focus-visible:outline-amber-200';
  const coverClass = 'block w-full overflow-hidden rounded-xl border border-amber-400/30 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200';
  return <section className={stage === 'cover' ? 'space-y-3 rounded-2xl border border-amber-400/25 bg-[#090e21] p-3' : 'space-y-4 rounded-2xl border border-amber-400/25 bg-[#090e21] p-4 md:col-span-3'} aria-labelledby="fintech-masterclass-heading" data-masterclass-stage={stage}>
    {stage !== 'cover' && <button type="button" className={backClass} onClick={() => onNavigate(stage === 'episodes' ? 'series' : 'cover')}>{stage === 'episodes' ? 'Zurück zu Fintech Deepdive' : 'Zurück zu den Videokategorien'}</button>}
    <h3 ref={headingRef} tabIndex={-1} id="fintech-masterclass-heading" className="text-lg font-bold text-amber-200">{stage === 'cover' ? FINTECH_CATEGORY : stage === 'series' ? 'Masterclass Videos' : 'Masterclass · Folgenübersicht'}</h3>
    {stage !== 'episodes' ? <>
      <button type="button" className={coverClass} onClick={() => onNavigate(stage === 'cover' ? 'series' : 'episodes')}>
        <img src={stage === 'cover' ? FINTECH_COVER : MASTERCLASS_COVER} alt="" width={1672} height={941} loading="lazy" decoding="async" className="block h-auto w-full" />
        <span className="block px-3 py-3 font-semibold text-amber-200">{stage === 'cover' ? 'Fintech Deepdive entdecken' : 'Zur Masterclass-Videoliste'}</span>
      </button>
      <p className="text-sm text-slate-300">{episodes.length ? 'Freigegebene Masterclass-Vorschauen ansehen.' : 'Masterclass-Folgen: Die Freigabe zur Wiedergabe steht noch aus.'}</p>
    </> : <>
      {episodes.length === 0 ? <p role="status" className="text-sm text-slate-300">Noch keine freigegebenen Masterclass-Videos zur Wiedergabe verfügbar.</p> :
        <div className="grid gap-4 md:grid-cols-2">{episodes.map(video => <VideoPlayer key={video.id} video={video} />)}</div>}
      <p className="text-xs text-slate-300">Die Inhalte dienen ausschließlich der Information und Finanzbildung. Keine Anlageberatung oder Kauf- bzw. Verkaufsempfehlung. Investitionen sind mit Risiken bis hin zum Totalverlust verbunden.</p>
    </>}
  </section>;
}

export function LearningVideos() {
  const [category,setCategory]=useState('Alle');
  const [masterclassStage,setMasterclassStage]=useState<MasterclassStage>('cover');
  const showFintech = category === 'Alle' || category === FINTECH_CATEGORY;
  const approvedVideos = visibleLearningVideos(LEARNING_VIDEOS);
  const categories = showFintech && masterclassStage !== 'cover' ? VIDEO_CATEGORIES.filter(value => value === FINTECH_CATEGORY) : VIDEO_CATEGORIES.filter(value => category === 'Alle' || category === value);
  return <section className="space-y-5" aria-labelledby="learning-video-title">
    <h2 id="learning-video-title" className="text-2xl font-bold text-white">Learning Portal · Videos</h2>
    <label className="block text-sm text-amber-200">Videokategorie
      <select value={category} onChange={e=>{setCategory(e.target.value);setMasterclassStage('cover');}} className="mt-2 min-h-11 w-full rounded-lg border border-amber-400/30 bg-slate-950 p-3 text-white">
        {['Alle',...VIDEO_CATEGORIES].map(value=><option key={value}>{value}</option>)}
      </select></label>
    <p className="text-sm text-slate-300">{approvedVideos.length === 0
      ? 'Noch keine veröffentlichten Lernvideos. Das verfügbare Lernangebot besteht unabhängig davon.'
      : 'Öffentlich freigegebene YouTube-Vorschau: höchstens ein Video je Kategorie. Kostenpflichtige Lerninhalte werden getrennt von YouTube bereitgestellt.'}</p>
    <div className="grid gap-4 md:grid-cols-3">{categories.map(value => {
      if (value === FINTECH_CATEGORY) return <FintechMasterclass key={value} stage={masterclassStage} onNavigate={setMasterclassStage} videos={approvedVideos}/>;
      const video = approvedVideos.find(item => item.category === value);
      if (video) return <VideoPlayer key={video.id} video={video}/>;
      return <article key={value} className="overflow-hidden rounded-2xl border border-amber-400/25 bg-[#090e21]">
        <LearningComingSoonGraphic category={value}/><div className="space-y-2 p-4"><h3 className="font-bold text-amber-200">{value}</h3>
        <p className="text-sm text-slate-300">Das erste Lernvideo erscheint hier demnächst als YouTube-Einbettung.</p>
        <p className="text-xs text-slate-400">Noch kein Video veröffentlicht. Eigene Illustration · Content- und Social-Engine-Entwurf.</p></div>
      </article>;
    })}</div>
    <nav aria-label="Weitere Lernangebote" className="flex flex-wrap gap-3 text-sm">
      <a href="/learning#learning-offer" className="inline-flex min-h-11 items-center rounded-lg border border-amber-400/40 px-4 py-2 font-semibold text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-200">Bestehendes Lernangebot ansehen</a>
      <a href="https://youtube.com/@capital-ai.online" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-slate-500/40 px-4 py-2 text-slate-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-200">CAPITAL AI auf YouTube (externer Dienst)</a>
    </nav>
  </section>;
}
