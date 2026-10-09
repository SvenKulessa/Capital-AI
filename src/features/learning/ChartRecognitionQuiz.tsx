import React, { useState } from 'react';
import { CHART_LESSONS, type ChartLesson } from '../../data/chartLearning';
import { ChartLessonGraphic } from './ChartLessonGraphic';
const patterns=CHART_LESSONS.filter(lesson=>lesson.category!=='Indikatoren');
export function chartQuestion(random = Math.random): { lesson: ChartLesson; options: ChartLesson[] } {
  const lesson=patterns[Math.floor(random()*patterns.length)];
  const distractors=patterns.filter(item=>item.id!==lesson.id);
  // Fisher-Yates, without the biased sort(() => random() - .5) pattern.
  for(let i=distractors.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[distractors[i],distractors[j]]=[distractors[j],distractors[i]];}
  const options=[lesson,...distractors.slice(0,3)];
  for(let i=options.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
  return {lesson,options};
}
export function ChartRecognitionQuiz({ allowed }: { allowed: boolean }) {
  const [question,setQuestion]=useState<ReturnType<typeof chartQuestion>|null>(null);
  const [answer,setAnswer]=useState<string|null>(null);
  if(!allowed) return <p className="mt-5 rounded-xl border border-amber-400/30 p-4 text-sm text-slate-300">Chart-Erkennungstraining: Learning Portal + aktives Pro-/Enterprise-Abonnement erforderlich. Owner haben vollständigen Zugang.</p>;
  function next(){setQuestion(chartQuestion());setAnswer(null);}
  return <section className="mt-5 space-y-4 rounded-2xl border border-amber-400/30 bg-slate-950 p-5" aria-label="Chart-Erkennungstraining">
    <h2 className="text-xl font-bold text-amber-200">Chartmuster erkennen · Multiple Choice</h2>
    {!question?<button className="min-h-11 rounded-lg bg-amber-400 px-4 text-black" type="button" onClick={next}>Training starten</button>:<>
      <ChartLessonGraphic lesson={question.lesson} quiz />
      <p className="text-sm text-slate-300">Welches Chartmuster ist schematisch dargestellt?</p>
      <div className="grid gap-2 sm:grid-cols-2">{question.options.map(option=><button type="button" key={option.id} disabled={answer!==null}
        onClick={()=>setAnswer(option.id)} className="min-h-11 rounded-lg border border-amber-400/30 p-3 text-left text-slate-200 disabled:opacity-70">{option.title}</button>)}</div>
      {answer!==null&&<div role="status" className="space-y-3 text-sm text-slate-200"><p>{answer===question.lesson.id?'Richtig.':'Noch einmal vergleichen.'} {question.lesson.title}: {question.lesson.recognition}</p><p>{question.lesson.confirmation}</p><button className="min-h-11 rounded-lg bg-amber-400 px-4 text-black" type="button" onClick={next}>Zufälliges nächstes Muster</button></div>}
    </>}
  </section>;
}
