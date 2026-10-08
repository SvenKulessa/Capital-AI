import { ChevronRight, Home } from 'lucide-react';
import { MAIN_HUBS_CONFIG } from './HubSidebarDrawer';

type RouteBreadcrumbsProps = {
  currentRoute: string;
  onNavigate: (path: string) => void;
};

const LABELS: Record<string, string> = {
  marketscreener: 'Marketscreener',
  studio: 'Studio Hub',
  architecture: 'Architektur',
  'pipeline-builder': 'Pipeline Builder',
  learning: 'Learning Portal',
  vocabulary: 'Vocabulary',
  dokumentation: 'Dokumentation',
  pricing: 'Preiskatalog',
  profile: 'Profil',
  security: 'Sicherheit',
  'key-vault': 'Key Vault',
  'control-center': 'Control Center',
  tokenomics: 'Tokenomics',
};

export function RouteBreadcrumbs({ currentRoute, onNavigate }: RouteBreadcrumbsProps) {
  const path = currentRoute.split('?')[0];
  if (path === '/' || path === '/login') return null;

  const segments = path.split('/').filter(Boolean);
  const items = segments.map((segment, index) => ({
    label: (
      segments[0] === 'control-center'
        ? MAIN_HUBS_CONFIG['control-center'].subpages.find((item) => item.id === segment)?.name
        : undefined
    ) || LABELS[segment] || segment.replaceAll('-', ' '),
    path: '/' + segments.slice(0, index + 1).join('/'),
  }));

  return (
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-[1440px] px-3 pt-2 sm:px-6">
      <ol className="flex min-h-9 flex-wrap items-center gap-1 text-[11px] font-mono text-slate-400">
        <li>
          <button type="button" onClick={() => onNavigate('/')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/5 hover:text-amber-300">
            <Home className="h-3.5 w-3.5" /> Capital-AI
          </button>
        </li>
        {items.map((item, index) => (
          <li key={item.path} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-slate-600" aria-hidden="true" />
            {index === items.length - 1 ? (
              <span aria-current="page" className="rounded-lg px-2 py-1 font-bold text-amber-300">{item.label}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(item.path)} className="rounded-lg px-2 py-1 hover:bg-white/5 hover:text-amber-300">
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
