import { BookOpen } from 'lucide-react';

const linkStyle =
  'text-cyan-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-amber-400';

export function ResearchProjectSummary({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  return (
    <section
      className="mx-5 my-6 rounded-2xl border border-cyan-500/20 bg-[#090e21] p-5 space-y-3"
      aria-labelledby="research-project-heading"
    >
      <h2
        id="research-project-heading"
        className="text-lg font-bold text-white flex gap-2 items-center"
      >
        <BookOpen size={20} className="text-cyan-300" />
        FinTech-Forschungsprojekt Capital-AI
      </h2>
      <p className="text-sm text-slate-300">
        Wir untersuchen, wie günstige gehostete Infrastruktur und nachvollziehbare
        Datenkonzepte heterogene FinTech-Datenströme in überprüfbare Scores überführen
        können. Im Mittelpunkt stehen Datenintegrität, Quellenherkunft, reproduzierbare
        Auswertung und robuste Verarbeitung.
      </p>
      <p className="text-sm text-slate-400">
        Forschungs- und Entwicklungsprojekt von Sven Kulessa. Eine Förderung über einen
        Innovationsgutschein und Sponsoring für Capital-AI sind geplant. Eine
        Förderzusage, Hochschulzugehörigkeit oder Provider-Partnerschaft wird damit nicht
        behauptet.
      </p>
      <a
        className={linkStyle}
        href="/datenprovider-lizenzen"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('/datenprovider-lizenzen');
        }}
      >
        Forschungsbedingungen und Datenrechte ansehen
      </a>
    </section>
  );
}
