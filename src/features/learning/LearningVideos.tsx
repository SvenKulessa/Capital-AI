import React, { useState } from 'react';
import { LearningComingSoonGraphic } from './LearningComingSoonGraphic';
export const VIDEO_CATEGORIES = ['Architektur','Fintech Deepdive','Social'] as const;
export type LearningVideo = { id: string; category: typeof VIDEO_CATEGORIES[number]; title: string; youtubeId: string };
// Publish only approved, licensed videos. The first item in each category is its fixed free preview.
export const LEARNING_VIDEOS: readonly LearningVideo[] = [];
export function visibleLearningVideos(videos: readonly LearningVideo[], entitled: boolean) {
  const seen = new Set<string>();
  return videos.filter(video => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(video.youtubeId)) return false;
    if (entitled) return true;
    if (seen.has(video.category)) return false;
    seen.add(video.category); return true;
  });
}
function VideoPlayer({ video }: { video: LearningVideo }) {
  const [consent, setConsent] = useState(false);
  return <article className="overflow-hidden rounded-2xl border border-amber-400/25 bg-[#090e21]">
    <h3 className="p-4 font-bold text-amber-200">{video.title}</h3>
    {consent ? <iframe className="aspect-video w-full" title={video.title}
      src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`} loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture" allowFullScreen />
      : <div className="space-y-3 p-4 text-sm text-slate-300"><p>Beim Laden verbindet sich dein Browser mit YouTube. Dabei wird deine IP-Adresse übermittelt.</p>
        <button type="button" onClick={() => setConsent(true)} className="min-h-11 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950">YouTube-Video laden</button></div>}
  </article>;
}
export function LearningVideos({ entitled }: { entitled: boolean }) {
  const [category,setCategory]=useState('Alle');
  const videos = visibleLearningVideos(LEARNING_VIDEOS, entitled).filter(video => category === 'Alle' || video.category === category);
  return <section className="space-y-5" aria-labelledby="learning-video-title">
    <h2 id="learning-video-title" className="text-2xl font-bold text-white">Learning Portal · Videos</h2>
    <label className="block text-sm text-amber-200">Videokategorie
      <select value={category} onChange={e=>setCategory(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-amber-400/30 bg-slate-950 p-3 text-white">
        {['Alle',...VIDEO_CATEGORIES].map(value=><option key={value}>{value}</option>)}
      </select></label>
    <p className="text-sm text-slate-300">{entitled?'Vollständiger Videozugang mit Learning Portal.':'Kostenlos: ein Video je Kategorie. Weitere Videos benötigen Learning Portal.'}</p>
    <div className="grid gap-4 md:grid-cols-3">{videos.map(video => <VideoPlayer key={video.id} video={video}/>)}{VIDEO_CATEGORIES.filter(value=>(category==='Alle'||category===value) && !LEARNING_VIDEOS.some(video => video.category === value)).map(value=><article key={value} className="overflow-hidden rounded-2xl border border-amber-400/25 bg-[#090e21]">
      <LearningComingSoonGraphic category={value}/><div className="space-y-2 p-4"><h3 className="font-bold text-amber-200">{value}</h3>
      <p className="text-sm text-slate-300">Das erste Lernvideo erscheint hier demnächst als YouTube-Einbettung.</p>
      <p className="text-xs text-slate-400">Noch kein Video veröffentlicht. Eigene Illustration · Content- und Social-Engine-Entwurf.</p></div>
    </article>)}</div>
  </section>;
}
