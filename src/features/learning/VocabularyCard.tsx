import React, { useState } from 'react';
import { Copy, Star, Check, BookOpen } from 'lucide-react';
import type { VocabularyCategory, VocabularyTerm } from '../../data/vocabularyData';

// Category remains a written label; color reinforces rather than replaces it.
export const VOCABULARY_CATEGORY_COLORS: Record<VocabularyCategory, { accent: string; background: string }> = {
  ALL: {accent:'#fcd34d',background:'#18170f'},
  TRADING_QUANT: {accent:'#67e8f9',background:'#0b2029'},
  AI_MODELS: {accent:'#c4b5fd',background:'#1a1530'},
  CRYPTO_WEB3: {accent:'#86efac',background:'#0c251d'},
  FUNDAMENTAL: {accent:'#fcd34d',background:'#25200d'},
  MACRO_FOREX: {accent:'#93c5fd',background:'#10213a'},
  DATA_EVIDENCE: {accent:'#5eead4',background:'#0a2525'},
  PLATFORM_ARCHITECTURE: {accent:'#a5b4fc',background:'#191b33'},
  SECURITY_COMPLIANCE: {accent:'#fda4af',background:'#30151e'},
  PRODUCT_UX: {accent:'#f9a8d4',background:'#2d1529'},
  DELIVERY_GOVERNANCE: {accent:'#fdba74',background:'#2c1d11'},
  MOBILE_RUNTIME: {accent:'#bef264',background:'#1c2510'},
};
export function VocabularyCard({term,flashcard=false,initialExpanded=false,saved=false,pending=false,onFavorite,onSelectAssetSymbol}: {
 term:VocabularyTerm;flashcard?:boolean;initialExpanded?:boolean;saved?:boolean;pending?:boolean;onFavorite?:(id:string)=>void;onSelectAssetSymbol?:(symbol:string)=>void;
}) {
 const [expanded,setExpanded]=useState(initialExpanded);
 const [copied,setCopied]=useState(false);
 const [error,setError]=useState('');
 const palette=VOCABULARY_CATEGORY_COLORS[term.category];
 async function copy() {
   try {await navigator.clipboard.writeText(`${term.term}\n${term.shortDefinition}`);setCopied(true);setError('');}
   catch {setError('Kopieren nicht verfügbar. Bitte den Text markieren.');}
 }
 return <article className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-5 sm:p-6" style={{borderColor:palette.accent+'66',background:palette.background}} data-vocabulary-category={term.category}>
   <div className="absolute inset-x-0 top-0 h-1" style={{backgroundColor:palette.accent}} aria-hidden="true" />
   <div className="flex items-start justify-between gap-3">
     <div className="min-w-0 space-y-2"><p className="text-xs font-semibold leading-5" style={{color:palette.accent}}>{term.categoryLabel}</p>
       <span className="inline-block rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs text-slate-100">{term.level}</span></div>
     {onFavorite&&<button type="button" disabled={pending} aria-pressed={saved} aria-label={`${term.term}: ${saved?'Favorit entfernen':'im Profil speichern'}`}
       onClick={()=>onFavorite(term.id)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:opacity-50">
       <Star className="h-5 w-5" fill={saved?'currentColor':'none'} /></button>}
   </div>
   <h3 className="mt-4 break-words text-xl font-bold leading-7 text-white">{term.term}</h3>
   {term.abbreviation&&<p className="mt-1 break-words text-sm leading-6" style={{color:palette.accent}}>{term.abbreviation}</p>}
   {!flashcard&&<div className="mt-3 flex flex-wrap gap-2" aria-label={`Synonyme für ${term.term}`}>{term.thesaurus.map((word,index)=><span key={index} className="rounded-md bg-black/20 px-2 py-1 text-xs leading-5 text-slate-200">{word}</span>)}</div>}
   {(!flashcard||expanded)&&<p className="mt-4 text-sm leading-7 text-slate-100">{term.shortDefinition}</p>}
   {!flashcard&&expanded&&<div id={`term-details-${term.id}`} className="mt-4 space-y-4 border-t border-white/15 pt-4 text-sm leading-7 text-slate-100">
     <div><h4 className="font-bold" style={{color:palette.accent}}>Erklärung</h4><p>{term.detailedExplanation}</p></div>
     {term.formulaOrRule&&<div className="rounded-xl bg-black/20 p-3"><h4 className="font-bold" style={{color:palette.accent}}>Regel / Formel</h4><p className="break-words">{term.formulaOrRule}</p></div>}
     <div><h4 className="font-bold" style={{color:palette.accent}}>Praxisbeispiel</h4><p>{term.practicalExample}</p></div>
     <div><h4 className="font-bold" style={{color:palette.accent}}>Merksatz</h4><p>{term.keyTakeaway}</p></div>
   </div>}
   <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
     <button type="button" aria-expanded={expanded} aria-controls={!flashcard&&expanded?`term-details-${term.id}`:undefined} onClick={()=>setExpanded(!expanded)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-black/25 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200" style={{color:palette.accent}}>
       <BookOpen className="h-4 w-4" />{flashcard?(expanded?'Begriff anzeigen':'Definition aufdecken'):(expanded?'Details schließen':'Details & Beispiel')}</button>
     {(!flashcard||expanded)&&<button type="button" onClick={()=>void copy()} aria-label={`${term.term}: Definition kopieren`} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20 text-slate-200 focus-visible:outline-2 focus-visible:outline-amber-200">{copied?<Check className="h-4 w-4" />:<Copy className="h-4 w-4" />}</button>}
   </div>
   {onSelectAssetSymbol&&term.relatedAssets?.length&&<div className="mt-3 flex flex-wrap gap-2">{term.relatedAssets.map(symbol=><button key={symbol} type="button" onClick={()=>onSelectAssetSymbol(symbol)} className="min-h-11 rounded-lg border border-white/20 px-3 text-sm text-slate-200">{symbol} analysieren</button>)}</div>}
   {copied&&<p role="status" className="mt-2 text-xs text-slate-200">Definition kopiert.</p>}
   {error&&<p role="alert" className="mt-2 text-sm text-rose-200">{error}</p>}
 </article>;
}
