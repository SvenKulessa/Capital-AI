import type { Locale } from './messages';
/** Shared, localized navigation labels. Never infer account access from locale. */
export const navigationCopy: Record<Locale, {
  main: string; close: string; profile: string; security: string; logout: string;
  hubs: string; pricing: string; assets: string; markets: string; login: string;
  loading: string; retry: string; retryLabel: string;
}> = {
  de: { main:'Hauptnavigation',close:'Navigation schließen',profile:'Profil',security:'Sicherheit',logout:'Abmelden',hubs:'Plattform-Hubs & Navigation',pricing:'Preiskatalog',assets:'Assetklassen & Unterklassen',markets:'Alle Märkte',login:'Anmelden',loading:'Sitzung wird geprüft …',retry:'Sitzung nicht verfügbar · Erneut prüfen',retryLabel:'Sitzung nicht verfügbar. Anmeldung erneut prüfen' },
  en: { main:'Main navigation',close:'Close navigation',profile:'Profile',security:'Security',logout:'Sign out',hubs:'Platform hubs & navigation',pricing:'Pricing',assets:'Asset classes & subcategories',markets:'All markets',login:'Sign in',loading:'Checking session …',retry:'Session unavailable · Retry',retryLabel:'Session unavailable. Retry sign-in check' },
  it: { main:'Navigazione principale',close:'Chiudi navigazione',profile:'Profilo',security:'Sicurezza',logout:'Esci',hubs:'Hub e navigazione',pricing:'Prezzi',assets:'Classi di attivi',markets:'Tutti i mercati',login:'Accedi',loading:'Verifica della sessione …',retry:'Sessione non disponibile · Riprova',retryLabel:'Sessione non disponibile. Riprovare' },
  fr: { main:'Navigation principale',close:'Fermer la navigation',profile:'Profil',security:'Sécurité',logout:'Se déconnecter',hubs:'Hubs et navigation',pricing:'Tarifs',assets:"Classes d'actifs",markets:'Tous les marchés',login:'Se connecter',loading:'Vérification de la session …',retry:'Session indisponible · Réessayer',retryLabel:'Session indisponible. Réessayer' },
  pt: { main:'Navegação principal',close:'Fechar navegação',profile:'Perfil',security:'Segurança',logout:'Terminar sessão',hubs:'Hubs e navegação',pricing:'Preços',assets:'Classes de ativos',markets:'Todos os mercados',login:'Entrar',loading:'A verificar a sessão …',retry:'Sessão indisponível · Tentar novamente',retryLabel:'Sessão indisponível. Repetir verificação' },
  es: { main:'Navegación principal',close:'Cerrar navegación',profile:'Perfil',security:'Seguridad',logout:'Cerrar sesión',hubs:'Hubs y navegación',pricing:'Precios',assets:'Clases de activos',markets:'Todos los mercados',login:'Iniciar sesión',loading:'Comprobando sesión …',retry:'Sesión no disponible · Reintentar',retryLabel:'Sesión no disponible. Reintentar' },
};
