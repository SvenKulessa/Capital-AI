import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { VOCABULARY_TERMS } from '../../data/vocabularyData';

export function useLearningFavorites() {
  const [ids,setIds] = useState<string[]>([]);
  const [error,setError] = useState('');
  const [pending,setPending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/learning/favorites',{signal:controller.signal,cache:'no-store'})
      .then(async response => { if(response.status===401) return; if(!response.ok) throw new Error(); const body=await response.json(); if(Array.isArray(body.favorites)) setIds(body.favorites); })
      .catch(() => { if(!controller.signal.aborted) setError('Favoriten konnten nicht geladen werden.'); });
    return () => controller.abort();
  },[]);
  async function toggle(id:string) {
    if(pending) return;
    setPending(true);setError('');
    try {
      const response=await fetch(`/api/learning/favorites?id=${encodeURIComponent(id)}`,{method:ids.includes(id)?'DELETE':'POST',signal:AbortSignal.timeout(10000)});
      if(response.status===401) {setError('Bitte anmelden, um Begriffe im Profil zu speichern.');return;}
      if(!response.ok) throw new Error();
      const body=await response.json();if(!Array.isArray(body.favorites)) throw new Error();setIds(body.favorites);
    } catch {setError('Favorit konnte nicht gespeichert werden. Bitte erneut versuchen.');}
    finally {setPending(false);}
  }
  return {ids,error,pending,toggle};
}
export function LearningFavoritesPanel() {
  const favorites=useLearningFavorites();
  return <section className="rounded-2xl border border-amber-400/25 bg-slate-950 p-5 md:col-span-3" aria-labelledby="learning-favorites-title">
    <h2 id="learning-favorites-title" className="text-lg font-bold text-amber-300">Meine Lernbegriffe</h2>
    {favorites.error && <p role="alert" className="text-sm text-rose-300">{favorites.error}</p>}
    {favorites.ids.length===0 ? <p className="mt-3 text-sm text-slate-300">Markiere Begriffe im Learning Portal mit einem Stern.</p> : <ul className="mt-3 space-y-2">{favorites.ids.map(id => <li key={id} className="flex items-center justify-between gap-3">
      <a className="text-sm text-cyan-200 underline" href={`/learning?tab=glossar&term=${encodeURIComponent(id)}`}>{VOCABULARY_TERMS.find(term=>term.id===id)?.term ?? id}</a>
      <button type="button" disabled={favorites.pending} aria-label={`Favorit ${id} entfernen`} onClick={()=>void favorites.toggle(id)} className="min-h-11 min-w-11 rounded-lg text-amber-300"><Star className="h-5 w-5" fill="currentColor" /></button>
    </li>)}</ul>}
  </section>;
}
