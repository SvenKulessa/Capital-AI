// Landing copy describes implemented surfaces without promising verified live feeds or scoring.
export const LANGUAGES = [
  { code:'de', name:'Deutsch' }, { code:'en', name:'English' },
  { code:'it', name:'Italiano' }, { code:'fr', name:'Français' },
  { code:'pt', name:'Português' }, { code:'es', name:'Español' },
] as const;
export type Locale = typeof LANGUAGES[number]['code'];
const keys = [
  'language','navOpen','navAlerts','navAccount','login',
  'heroEyebrow','hero1','hero2','heroDescription','heroOpenLearning','heroAnalysisDemo','heroProductTour','analyze','assistant','discover',
  'pillarRealtime','pillarAi','pillarAudience','pillarGlobal',
  'imprint','terms','privacy','pricing','docs','external',
  'contentTitle','contentHighlight','contentDescription','contentSources','contentCampaign','contentPublish',
] as const;
export type MessageKey = typeof keys[number];
const localized: Record<Locale, readonly string[]> = {
  de: [
    'Sprache auswählen','Navigation öffnen','Preisalarme öffnen','Kontomenü öffnen','Anmelden',
    'FINANZWISSEN UND ANALYSE VERSTÄNDLICH GEMACHT','Finanzmärkte verstehen.','Daten nachvollziehbar einordnen.',
    'CAPITAL-AI verbindet verständliches Finanzwissen mit transparenten Analyse- und Scoring-Methoden. Lerne zentrale Marktbegriffe, prüfe Daten systematisch und erkenne, wie Bewertungen entstehen.',
    'Learning Hub öffnen','Analyse entdecken','CAPITAL-AI-Tour starten',
    'Analyse starten','Hero Buddy öffnen','CAPITAL-AI entdecken',
    'Quellen und Datenstatus','Modelle erklärt','Für Privatanleger','Globale Märkte',
    'Impressum','AGB','Datenschutz','Preiskatalog','Dokumentation & Lizenzen','öffnet in einem neuen Tab',
    'Von der belegten Quelle',' zum Entwurf',
    'Die Content Engine führt belegte Informationen in Entwürfe für Text, Bild, Audio und Video über. Quelle, Format und Prüfstatus bleiben nachvollziehbar.',
    'Quellen','Beispielkampagne','Veröffentlichung deaktiviert',
  ],
  en: [
    'Select language','Open navigation','Open price alerts','Open account menu','Log in',
    'Financial knowledge and analysis made clear','Understand financial markets.','Make sense of data.',
    'CAPITAL-AI combines accessible financial education with transparent analysis and scoring methods. Learn key market terms, examine data systematically and see how assessments are made.',
    'Open Learning Hub','Explore analysis','View platform tour',
    'Start analysis','Ask Hero Buddy','Explore product',
    'Sources and data status','Transparent models','For retail and professional investors','Global markets, one platform',
    'Legal notice','Terms','Privacy','Pricing','Documentation & licenses','opens in a new tab',
    'Evidence-backed product facts become',' modular content.',
    'The Content Engine connects existing Growth tools in a traceable pipeline for text, images, audio, video and attribution. Publishing remains a separate adapter for the future Social Media Engine.',
    'Source layer','Campaign 01','Public publishing: off',
  ],
  it: [
    'Seleziona lingua','Apri navigazione','Apri avvisi sui prezzi','Apri menu account','Accedi',
    'Educazione finanziaria e analisi accessibili','Comprendi i mercati finanziari.','Interpreta i dati con chiarezza.',
    'CAPITAL-AI unisce educazione finanziaria accessibile e metodi trasparenti di analisi e scoring. Impara i termini di mercato, esamina i dati e comprendi come si formano le valutazioni.',
    'Apri il Learning Hub','Scopri le analisi','Guarda il tour della piattaforma',
    'Avvia analisi','Chiedi a Hero Buddy','Scopri il prodotto',
    'Fonti e stato dei dati','Modelli trasparenti','Per investitori privati e professionisti','Mercati globali in un’unica piattaforma',
    'Note legali','Termini e condizioni','Privacy','Prezzi','Documentazione e licenze','si apre in una nuova scheda',
    'Dai fatti di prodotto verificabili nascono',' contenuti modulari.',
    'Il Content Engine collega gli strumenti Growth esistenti in una pipeline tracciabile per testi, immagini, audio, video e attribuzione. La pubblicazione resta un adattatore separato per il futuro Social Media Engine.',
    'Livello delle fonti','Campagna 01','Pubblicazione pubblica: disattivata',
  ],
  fr: [
    'Choisir la langue','Ouvrir la navigation','Ouvrir les alertes de prix','Ouvrir le menu du compte','Connexion',
    'La finance et l’analyse rendues accessibles','Comprendre les marchés financiers.','Interpréter les données avec clarté.',
    'CAPITAL-AI associe formation financière accessible et méthodes transparentes d’analyse et de scoring. Apprenez les notions clés, examinez les données et comprenez comment les évaluations sont établies.',
    'Ouvrir le Learning Hub','Découvrir l’analyse','Voir la visite de la plateforme',
    'Lancer une analyse','Demander à Hero Buddy','Découvrir le produit',
    'Sources et statut des données','Modèles transparents','Pour particuliers et professionnels','Marchés mondiaux sur une plateforme',
    'Mentions légales','Conditions générales','Confidentialité','Tarifs','Documentation et licences','s’ouvre dans un nouvel onglet',
    'Des faits produits vérifiables deviennent',' du contenu modulaire.',
    'Le Content Engine relie les outils Growth existants dans un processus traçable pour le texte, les images, l’audio, la vidéo et l’attribution. La publication reste un adaptateur séparé pour le futur Social Media Engine.',
    'Sources','Campagne 01','Publication publique : désactivée',
  ],
  pt: [
    'Selecionar idioma','Abrir navegação','Abrir alertas de preços','Abrir menu da conta','Entrar',
    'Educação financeira e análise acessíveis','Compreenda os mercados financeiros.','Interprete os dados com clareza.',
    'CAPITAL-AI combina educação financeira acessível com métodos transparentes de análise e scoring. Aprenda os conceitos de mercado, examine os dados e compreenda como são feitas as avaliações.',
    'Abrir o Learning Hub','Explorar análises','Ver a visita à plataforma',
    'Iniciar análise','Perguntar ao Hero Buddy','Explorar produto',
    'Fontes e estado dos dados','Modelos transparentes','Para investidores individuais e profissionais','Mercados globais numa só plataforma',
    'Aviso legal','Termos e condições','Privacidade','Preços','Documentação e licenças','abre num novo separador',
    'Factos comprovados sobre o produto tornam-se',' conteúdo modular.',
    'O Content Engine liga as ferramentas Growth existentes num fluxo rastreável de texto, imagem, áudio, vídeo e atribuição. A publicação mantém-se como um adaptador separado para o futuro Social Media Engine.',
    'Fontes','Campanha 01','Publicação pública: desligada',
  ],
  es: [
    'Seleccionar idioma','Abrir navegación','Abrir alertas de precios','Abrir menú de cuenta','Iniciar sesión',
    'Educación financiera y análisis accesibles','Comprende los mercados financieros.','Interpreta los datos con claridad.',
    'CAPITAL-AI combina educación financiera accesible con métodos transparentes de análisis y scoring. Aprende los conceptos del mercado, examina los datos y comprende cómo se elaboran las evaluaciones.',
    'Abrir el Learning Hub','Explorar análisis','Ver el recorrido de la plataforma',
    'Iniciar análisis','Preguntar a Hero Buddy','Explorar el producto',
    'Fuentes y estado de los datos','Modelos transparentes','Para inversores particulares y profesionales','Mercados globales en una sola plataforma',
    'Aviso legal','Términos y condiciones','Privacidad','Precios','Documentación y licencias','se abre en una pestaña nueva',
    'Los datos verificables del producto se convierten en',' contenido modular.',
    'El Content Engine conecta las herramientas Growth existentes en un flujo trazable de texto, imágenes, audio, vídeo y atribución. La publicación sigue siendo un adaptador independiente para el futuro Social Media Engine.',
    'Fuentes','Campaña 01','Publicación pública: desactivada',
  ],
};
export const messages = Object.fromEntries(Object.entries(localized).map(([locale, values]) =>
  [locale, Object.fromEntries(keys.map((key, index) => [key, values[index]]))]
)) as Record<Locale, Record<MessageKey,string>>;
export const messageKeys = keys;
export const messageArrays = localized;
export function isLocale(value: string): value is Locale {
  return LANGUAGES.some(lang => lang.code === value);
}

export function localizedLandingMetadata(locale: Locale) {
  const copy = messages[locale];
  return {
    title: `${copy.heroEyebrow} | CAPITAL-AI`,
    description: copy.heroDescription,
  };
}
