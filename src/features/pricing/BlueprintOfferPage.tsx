import { useEffect } from 'react';
import { BlueprintCommercePanel } from '../studio/BlueprintCommercePanel';
import { updatePageSEO } from '../../utils/analytics';
export function BlueprintOfferPage() {
  useEffect(() => { updatePageSEO({ title: 'Blueprints | CAPITAL-AI', description: 'Technische Architekturkonzepte für nachvollziehbare Analysen.', canonicalPath: '/blueprints' }); }, []);
  return <section aria-labelledby="blueprint-offer-heading" className="mx-auto max-w-4xl space-y-6 px-[12px] sm:px-6 py-12 text-slate-100">
    <h1 id="blueprint-offer-heading" className="break-words text-2xl font-bold sm:text-3xl">Blueprints für deine Analyse</h1>
    <p className="text-base leading-7">Prüfe die technischen Architekturkonzepte und die Lizenzbedingungen für dein Unternehmen.</p>
    <h2 className="sr-only">Verfügbare Angebote</h2>
    <BlueprintCommercePanel publicOfferPage onNavigateLogin={() => window.location.assign('/login')} />
    <a href="/" className="inline-flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-amber-200">Zur Startseite</a>
  </section>;
}
