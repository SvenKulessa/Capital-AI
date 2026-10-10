import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { VOCABULARY_TERMS, VOCABULARY_CATEGORIES, type VocabularyCategory, type VocabularyTerm } from '../../data/vocabularyData';
import { VocabularyCard } from './VocabularyCard';
import { LearningPurchase } from './LearningPurchase';
import { freeVocabularySelection } from './learningPolicy';
import { useLearningFavorites } from './LearningFavorites';
interface MarketVocabularyModalProps {isOpen:boolean;onClose:()=>void;onOpenAnalysis?:()=>void;onSelectAssetSymbol?:(symbol:string)=>void;}
export function MarketVocabularyModal(props:MarketVocabularyModalProps) {
  return props.isOpen ? <VocabularyDialog {...props}/> : null;
}
function VocabularyDialog({onClose,onOpenAnalysis,onSelectAssetSymbol}:MarketVocabularyModalProps) {
 const [query,setQuery]=useState('');const [category,setCategory]=useState<VocabularyCategory>('ALL');const [level,setLevel]=useState('ALL');
 const [entitled,setEntitled]=useState(false);const [protectedTerms,setProtectedTerms]=useState<VocabularyTerm[]>([]);const [error,setError]=useState('');
 const favorites=useLearningFavorites();const dialog=useRef<HTMLDivElement>(null);const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const previous=document.activeElement;close.current?.focus();
  const controller=new AbortController();
  async function access() {
    try {
      const preview=await fetch('/api/learning/vocabulary/preview',{signal:controller.signal}).then(r=>r.ok?r.json():null);
      if(Array.isArray(preview?.terms))setProtectedTerms(preview.terms);
      const response=await fetch('/api/billing/vocabulary/access',{signal:controller.signal,cache:'no-store'});
      if(response.status===401)return;if(!response.ok)throw new Error();
      const rights=await response.json();setEntitled(rights?.quantProEntitled===true);
      if(rights?.quantProEntitled) {
        const termsResponse=await fetch('/api/learning/vocabulary/quant-pro',{signal:controller.signal,cache:'no-store'});
        if(!termsResponse.ok)throw new Error();const payload=await termsResponse.json();if(Array.isArray(payload.terms))setProtectedTerms(payload.terms);
      }
    } catch {if(!controller.signal.aborted)setError('Lernzugang konnte nicht vollständig geladen werden.');}
  }
  void access();
  function key(event:KeyboardEvent) {
    if(event.key==='Escape'){event.preventDefault();onClose();}
    if(event.key!=='Tab')return;
    const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select')??[]);
    if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  document.addEventListener('keydown',key);
  return ()=>{controller.abort();document.removeEventListener('keydown',key);if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[onClose]);
 const terms=useMemo(()=>{const full=[...VOCABULARY_TERMS,...protectedTerms];return entitled?full:freeVocabularySelection(full);},[entitled,protectedTerms]);
 const visible=terms.filter(term=>(category==='ALL'||term.category===category)&&(level==='ALL'||term.level===level)&&[term.term,term.abbreviation,term.shortDefinition,...term.thesaurus].some(value=>value?.toLocaleLowerCase('de-DE').includes(query.toLocaleLowerCase('de-DE'))));
 return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-2 sm:items-center sm:p-6">
  <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="vocabulary-dialog-title" className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-amber-400/30 bg-[#090e21] p-4 sm:p-6">
   <header className="flex items-center justify-between gap-3"><h2 id="vocabulary-dialog-title" className="text-2xl font-bold text-amber-200">Learning Portal · Vocabulary</h2><button ref={close} type="button" aria-label="Vocabulary schließen" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20 text-white"><X className="h-5 w-5"/></button></header>
   <p className="mt-3 text-sm leading-7 text-slate-300">{entitled?'Vollständiger Lernzugang aktiv.':'Sieben feste Begriffe je Skill-Level kostenlos. Alle Kategorien und Level bleiben auswählbar.'}</p>
   <div className="my-5 grid gap-3 sm:grid-cols-3">
    <label className="text-sm text-slate-200">Begriff suchen<input value={query} onChange={e=>setQuery(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-amber-400/30 bg-slate-950 p-3"/></label>
    <label className="text-sm text-slate-200">Kategorie<select value={category} onChange={e=>setCategory(e.target.value as VocabularyCategory)} className="mt-2 min-h-11 w-full rounded-lg border border-amber-400/30 bg-slate-950 p-3">{VOCABULARY_CATEGORIES.map(cat=><option key={cat.id} value={cat.id}>{cat.label}</option>)}</select></label>
    <label className="text-sm text-slate-200">Skill-Level<select value={level} onChange={e=>setLevel(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-amber-400/30 bg-slate-950 p-3">{['ALL','Einsteiger','Fortgeschritten','Quant / Pro'].map(value=><option key={value} value={value}>{value==='ALL'?'Alle Level':value}</option>)}</select></label>
   </div>
   {(error||favorites.error)&&<p role="alert" className="mb-4 text-sm text-rose-200">{error||favorites.error}</p>}
   <div className="grid gap-4 md:grid-cols-2">{visible.map(term=><VocabularyCard key={term.id} term={term} saved={favorites.ids.includes(term.id)} pending={favorites.pending} onFavorite={id=>void favorites.toggle(id)} onSelectAssetSymbol={onSelectAssetSymbol}/>)}</div>
   {visible.length===0&&<p className="p-5 text-sm text-slate-300">Keine Begriffe in dieser Auswahl. Filter ändern oder den vollständigen Lernzugang erwerben.</p>}
   <div className="mt-5">{!entitled?<LearningPurchase onLogin={()=>window.location.assign('/login')}/>:<a href="/api/billing/vocabulary/badge" download className="text-sm text-amber-200 underline">Lizenzierten Vocabulary-Badge herunterladen</a>}</div>
   {onOpenAnalysis&&<button type="button" onClick={()=>{onClose();onOpenAnalysis();}} className="mt-4 min-h-11 rounded-lg border border-amber-400/30 px-4 text-sm text-amber-200">Analyse öffnen</button>}
  </div>
 </div>;
}
