import demo from '../../../shared/sentiment-learning-demo.json';
export function SentimentBlueprintDemo() {
 const total=demo.positive+demo.neutral+demo.negative;
 const index=(demo.positive-demo.negative)/total*100;
 return <section aria-labelledby="sentiment-demo-title" className="my-6 rounded-2xl border border-brand-ai bg-brand-canvas p-5">
   <h2 id="sentiment-demo-title" className="text-xl font-bold text-amber-200">{demo.label}</h2>
   <p className="mt-3 text-base leading-7 text-slate-200">{demo.window}: {total} frei erfundene Textbeispiele zeigen, wie sich ein Sentiment-Index berechnen lässt.</p>
   <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Positiv',demo.positive],['Neutral',demo.neutral],['Negativ',demo.negative],['Index (−100 bis +100)',`+${index.toLocaleString('de-DE')}`]].map(([label,value])=><div key={label} className="rounded-xl border border-white/20 p-3"><dt className="text-sm text-slate-300">{label}</dt><dd className="mt-2 text-2xl font-bold text-white">{value}</dd></div>)}</dl>
   <p className="mt-4 text-base text-cyan-200">{demo.formula} = ({demo.positive} − {demo.negative}) / {total} × 100 = +{index}</p>
   <p className="mt-3 text-sm leading-7 text-slate-300">{demo.disclaimer} Der Index misst nur das Verhältnis dieser Demo-Klassen und ist keine Aussage zur künftigen Kursentwicklung.</p>
 </section>;
}
