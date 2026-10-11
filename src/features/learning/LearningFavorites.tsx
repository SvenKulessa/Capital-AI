import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { vocabularyMetadataById } from '../../../shared/vocabulary-metadata.mjs';

export function useLearningFavorites() {
  const [ids,setIds] = useState<string[]>([]);
  const [error,setError] = useState('');
  const [pending,setPending] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [authenticated,setAuthenticated] = useState(true);
  const lock = useRef(false);
  const revision=useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/learning/favorites',{signal:controller.signal,cache:'no-store',credentials:'same-origin'})
      .then(async response => {
        if(response.status===401) {setAuthenticated(false);setLoaded(true);return;}
        if(!response.ok) throw new Error();
        const body=await response.json();
        if(!Array.isArray(body.favorites)||!body.favorites.every((id:unknown)=>typeof id==='string')) throw new Error();
        if(revision.current===0) {setIds(body.favorites);setLoaded(true);}
      })
      .catch(() => { if(!controller.signal.aborted) setError('Lernbegriffe konnten nicht geladen werden. Bitte lade die Seite erneut.'); });
    return () => controller.abort();
  },[]);
  async function update(id:string,method:'POST'|'DELETE'):Promise<boolean> {
    if(lock.current) return false;
    lock.current=true;revision.current+=1;setPending(true);setError('');
    try {
      const response=await fetch(`/api/learning/favorites?id=${encodeURIComponent(id)}`,{method,cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000)});
      if(response.status===401) {setAuthenticated(false);setError('Bitte anmelden, um Begriffe im privaten Lernfeld zu speichern.');return false;}
      if(!response.ok) throw new Error();
      const body=await response.json();
      if(!Array.isArray(body.favorites)||!body.favorites.every((value:unknown)=>typeof value==='string')) throw new Error();
      setIds(body.favorites);setLoaded(true);return true;
    } catch {setError('Lernbegriff konnte nicht gespeichert oder entfernt werden. Bitte erneut versuchen.');return false;}
    finally {lock.current=false;setPending(false);}
  }
  return {ids,error,pending,loaded,authenticated,
    add:(id:string)=>update(id,'POST'),remove:(id:string)=>update(id,'DELETE'),
    toggle:(id:string)=>update(id,ids.includes(id)?'DELETE':'POST')};
}
export function LearningFavoritesPanel() {
  const favorites=useLearningFavorites();
  return <section className="rounded-2xl border border-amber-400/25 bg-slate-950 p-5 md:col-span-3" aria-labelledby="learning-favorites-title">
    <h2 id="learning-favorites-title" className="text-lg font-bold text-amber-300">Mein Lernfeld</h2>
    <p className="mt-2 text-sm leading-7 text-slate-300">Hier findest du nach links gewischte und mit einem Stern markierte Wörter. Entferne einen Begriff mit dem X, sobald du ihn gelernt hast.</p>
    {favorites.error && <p role="alert" className="text-sm text-rose-300">{favorites.error}</p>}
    {!favorites.authenticated ? <a className="inline-flex min-h-11 items-center text-amber-200 underline" href="/login">Zum Speichern anmelden</a>
      : !favorites.loaded ? <p role="status">{favorites.error ? 'Lernfeld derzeit nicht verfügbar.' : 'Lernfeld wird geladen …'}</p>
      : favorites.ids.length===0 ? <p role="status" className="mt-3 text-sm text-slate-300">Dein Lernfeld ist leer. Wische im Karteikasten nach links oder markiere ein Wort mit einem Stern.</p>
      : <ul className="mt-3 space-y-2">{favorites.ids.map(id => {
        const term=vocabularyMetadataById.get(id)?.term ?? id;
        return <li key={id} className="flex items-center justify-between gap-3">
          <a className="min-w-0 break-words text-sm text-cyan-200 underline" href={`/learning?tab=glossar&term=${encodeURIComponent(id)}`}>{term}</a>
          <button type="button" disabled={favorites.pending} aria-label={`${term}: aus dem Lernfeld entfernen`} onClick={()=>void favorites.remove(id)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-rose-400/30 text-rose-200 hover:bg-rose-400/10 focus-visible:outline-2 focus-visible:outline-amber-200 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </li>;
      })}</ul>}
  </section>;
}
