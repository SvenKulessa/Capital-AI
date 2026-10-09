import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Database,
  FileText,
  HelpCircle,
  Info,
  Lock,
  Printer,
  Scale,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CONTROLLER,
  PRIVACY_COMPLIANCE_STATUS,
  PRIVACY_NOTICE_VERSION,
  PRIVACY_REQUEST_TYPES,
  PROCESSING_ACTIVITIES,
  type PrivacyRequestType,
} from '../privacy/privacyPolicy';
import {
  TERMS_EFFECTIVE_DATE,
  TERMS_VERSION,
} from '../content/legalDocumentVersions';
import {
  PUBLIC_CONTACT_PHONE,
  PUBLIC_FAQ_CATEGORIES,
  PUBLIC_FAQ_ITEMS,
} from '../content/publicLegalContent';
import { BrandLogo } from './BrandLogo';
import { useLocale } from '../i18n/LocaleProvider';
import { legalAvailabilityNotice } from '../i18n/legalAvailability';

export type LegalRoute = '/faq' | '/datenschutz' | '/agb' | '/impressum';

interface LegalAndFaqPagesProps {
  route: LegalRoute;
  onNavigate: (path: string) => void;
}

const REQUEST_LABELS: Record<PrivacyRequestType, string> = {
  access: 'Auskunft',
  rectification: 'Berichtigung',
  erasure: 'Löschung',
  restriction: 'Einschränkung',
  objection: 'Widerspruch',
  portability: 'Datenübertragbarkeit',
};

export function LegalAndFaqPages({ route, onNavigate: navigate }: LegalAndFaqPagesProps) {
  const { locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  const [requestType, setRequestType] = useState<PrivacyRequestType>('access');
  const [details, setDetails] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('');

  useEffect(() => {
    setAuthenticated(false);
    setPrivacyMessage('');
    if (route !== '/datenschutz') return;
    const abort = new AbortController();
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', signal: abort.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(body => setAuthenticated(body.authenticated === true))
      .catch(() => setAuthenticated(false));
    return () => abort.abort();
  }, [route]);
  const categories = useMemo(() => ['Alle', ...PUBLIC_FAQ_CATEGORIES], []);

  const filteredFaqs = useMemo(() => {
    const normalized = searchQuery.trim().toLocaleLowerCase('de-DE');
    return PUBLIC_FAQ_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === 'Alle' || item.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!normalized) return true;
      return [item.question, item.answer, item.category].some((value) =>
        value.toLocaleLowerCase('de-DE').includes(normalized),
      );
    });
  }, [searchQuery, selectedCategory]);

  async function submitPrivacyRequest() {
    if (!authenticated) {
      const subject = `Datenschutzanfrage: ${REQUEST_LABELS[requestType]}`;
      window.location.href = `mailto:${CONTROLLER.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(details.trim())}`;
      return;
    }
    setPrivacyBusy(true);
    setPrivacyMessage('');
    try {
      const response = await fetch('/api/privacy/requests', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType, details: details.trim() }), signal: AbortSignal.timeout(7000),
      });
      const body = await response.json();
      if (response.status === 401) setAuthenticated(false);
      if (!response.ok || body.status !== 'email_draft' || body.persisted !== false || body.sent !== false ||
          typeof body.mailto !== 'string' || !body.mailto.startsWith(`mailto:${CONTROLLER.email}?`)) throw new Error();
      setPrivacyMessage('E-Mail-Entwurf vorbereitet. Erst durch Ihren Versand wird die Anfrage übermittelt.');
      window.location.href = body.mailto;
    } catch {
      setPrivacyMessage(`Der Entwurf konnte nicht vorbereitet werden. Sie können direkt an ${CONTROLLER.email} schreiben.`);
    } finally { setPrivacyBusy(false); }
  }

  async function downloadAccountData() {
    setPrivacyBusy(true);
    setPrivacyMessage('');
    try {
      const response = await fetch('/api/privacy/export', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(7000) });
      if (response.status === 401) setAuthenticated(false);
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'capital-ai-datenauszug.json';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPrivacyMessage('Datenauszug erstellt: Identitäts- und Sitzungsdaten dieses Dienstes. Supabase Auth-Kontodaten, Finance-Altdaten und E-Mail-Anfragen sind nicht enthalten.');
    } catch { setPrivacyMessage('Der Datenauszug ist nicht verfügbar. Bitte melden Sie sich erneut an oder kontaktieren Sie den Datenschutzkontakt.'); }
    finally { setPrivacyBusy(false); }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const handleCopy = () => {
    const text = document.getElementById('main-content')?.innerText;
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }).catch(() => setCopied(false));
    }
  };

  return (
    <main
      id="main-content"
      data-design-source="SvenKulessa/FRONTEND"
      data-design-source-commit="f2a101330d74420c373f0ec56fa58caac53d741d"
      data-content-owner="CAPITAL-AI-COMP"
      className="w-full min-h-screen bg-[#02050e] text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 sm:pb-16 relative overflow-hidden"
    >
      <div aria-hidden="true" className="absolute top-10 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-[#8D26FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute top-60 -left-20 w-80 h-80 bg-[#F9BF21]/10 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-20 -right-20 w-80 h-80 bg-[#44DE88]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 z-10 pt-2 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Terminal</span>
          </button>
          <BrandLogo variant="inline" size="sm" onClick={() => navigate('/')} />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
            title="Aktuellen Inhalt in die Zwischenablage kopieren"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Inhalt kopieren</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
            title="Drucken oder als PDF exportieren"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden xs:inline">Drucken / PDF</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl z-10 mt-4 flex items-center justify-between gap-2 overflow-x-auto p-1.5 bg-black/50 border border-slate-800/90 rounded-2xl">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            type="button"
            onClick={() => navigate('/faq')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              route === '/faq'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(249,191,33,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>FAQ</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/datenschutz')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              route === '/datenschutz'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(68,222,136,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#44DE88]" />
            <span>Datenschutz</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/agb')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              route === '/agb'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-[0_0_12px_rgba(255,46,147,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#FF2E93]" />
            <span>AGB</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/impressum')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              route === '/impressum'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(141,38,255,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#8D26FF]" />
            <span>Impressum</span>
          </button>
        </div>

      </div>

      <div className="w-full max-w-4xl z-10 mt-6">
        {locale !== 'de' && (
          <div role="note" className="mb-5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
            {legalAvailabilityNotice[locale]}
          </div>
        )}
        {route === '/faq' && (
          <motion.div lang="de" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Häufig gestellte Fragen</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                CAPITAL-AI · Fragen & Antworten
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Repository-belegte Informationen zu Plattform, Datenqualität, Datenschutz, Konto,
                Abonnement und rechtlicher Transparenz.
              </p>

              <div className="relative max-w-md mx-auto mt-4">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <label htmlFor="faq-search" className="sr-only">FAQ durchsuchen</label>
                <input
                  id="faq-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Frage oder Stichwort suchen..."
                  className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-sans"
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedCategory === category
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-slate-800/80'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#070b19]/80 border border-amber-500/20 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-bold text-white">Multi-Asset Analyse</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Quantitative Analyse- und Scoringfunktionen über mehrere Anlageklassen.</p>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#070b19]/80 border border-[#44DE88]/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#44DE88] shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-bold text-white">Datenschutz</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Verarbeitungstätigkeiten und Betroffenenrechte werden transparent ausgewiesen.</p>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#070b19]/80 border border-[#8D26FF]/20 flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-bold text-white">Belegte Aussagen</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Nicht verifizierte Lizenz-, Hosting- oder Zertifizierungsbehauptungen werden nicht als Fakten ausgegeben.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {filteredFaqs.length === 0 ? (
                <div className="text-center p-4 text-sm text-slate-500 bg-black/40 rounded-2xl border border-slate-800/80">
                  Keine passende Frage gefunden.
                </div>
              ) : (
                filteredFaqs.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800/80 bg-[#070b19]/80 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                      aria-expanded={openFaqIndex === index}
                      className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-amber-300 font-mono">{item.category}</span>
                        <h2 className="text-sm font-bold text-white ">{item.question}</h2>
                      </div>
                      {openFaqIndex === index ? (
                        <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaqIndex === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="px-4 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2">
                            {item.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {route === '/datenschutz' && (
          <motion.div lang="de"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 bg-[#070b19]/90 border border-emerald-500/20 rounded-3xl p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#44DE88] shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Datenschutzerklärung</h1>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Version {PRIVACY_NOTICE_VERSION}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Datenschutzhinweise nach Art. 13 DSGVO</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{PRIVACY_COMPLIANCE_STATUS.label}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">{PRIVACY_COMPLIANCE_STATUS.disclaimer}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800/80 space-y-2">
                <h2 className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Verantwortlicher</h2>
                <div className="text-sm font-bold text-white">{CONTROLLER.name}</div>
                <div className="text-xs text-slate-300 space-y-0.5">
                  <p>{CONTROLLER.street}</p>
                  <p>{CONTROLLER.postalCode} {CONTROLLER.city}</p>
                  <p>{CONTROLLER.country}</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800/80 space-y-2">
                <h2 className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Datenschutzkontakt</h2>
                <div className="text-xs text-slate-300 space-y-1">
                  <p><a className="text-emerald-300 underline" href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a></p>
                  <p><a className="text-emerald-300 underline" href={`mailto:${CONTROLLER.supportEmail}`}>{CONTROLLER.supportEmail}</a></p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div>
                <h2 className="text-base font-bold text-white text-emerald-300 flex items-center gap-2">
                  <Database className="w-4 h-4" /> Verarbeitungstätigkeiten
                </h2>
                <p className=" text-xs text-slate-400">
                  Diese Hinweise beschreiben den Dienst mit Supabase Auth-Anmeldung. Eine automatische Übernahme alter Finance-Konten oder ihrer Daten erfolgt nicht. Optionales Analytics und Werbung sind in diesem Dienst deaktiviert.
                </p>
              </div>
              {PROCESSING_ACTIVITIES.map((activity) => (
                <details key={activity.id} className="rounded-2xl bg-black/40 border border-slate-800/80 overflow-hidden">
                  <summary className="cursor-pointer px-4 py-2.5 font-bold text-white flex items-center justify-between">
                    <span>{activity.title}</span>
                    <span className="text-[10px] uppercase font-mono text-emerald-400">Details</span>
                  </summary>
                  <div className="border-t border-slate-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-3">
                      <div><strong className="block text-emerald-300">Zweck</strong>{activity.purpose}</div>
                      <div><strong className="block text-emerald-300">Datenkategorien</strong>{activity.dataCategories.join(' · ')}</div>
                      <div><strong className="block text-emerald-300">Rechtsgrundlage</strong>{activity.legalBasis}</div>
                    </div>
                    <div className="space-y-3">
                      <div><strong className="block text-emerald-300">Empfänger</strong>{activity.recipients.join(' · ')}</div>
                      <div><strong className="block text-emerald-300">Drittland / Transfer</strong>{activity.transfer}</div>
                      <div><strong className="block text-emerald-300">Speicherung / Löschung</strong>{activity.retention}</div>
                      <div><strong className="block text-emerald-300">Technische Kontrollen</strong>{activity.technicalControls.join(' · ')}</div>
                    </div>
                  </div>
                </details>
              ))}
            </div>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white text-emerald-300 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Ihre Datenschutzrechte
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Sie können Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch oder Datenübertragbarkeit anfragen.
                Gesetzlich oder sicherheitsbedingt aufzubewahrende Daten können vorübergehend eingeschränkt statt sofort gelöscht werden.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRIVACY_REQUEST_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRequestType(type)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      requestType === type
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-800 bg-black/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    {REQUEST_LABELS[type]}
                  </button>
                ))}
              </div>
              <textarea
                aria-label="Optionale Angaben zur Datenschutzanfrage"
                value={details}
                onChange={(event) => setDetails(event.target.value.slice(0, 2000))}
                placeholder="Optionale Angaben zur Anfrage (keine Passwörter, MFA-Secrets oder Zahlungsdaten eingeben)."
                className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={submitPrivacyRequest}
                disabled={privacyBusy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-white/10"
              >
                <Send className="w-4 h-4" />
                {`${REQUEST_LABELS[requestType]} per E-Mail vorbereiten`}
              </button>
              <p className="text-xs text-slate-400">
                Öffnet Ihr E-Mail-Programm. Die Anfrage wird erst durch Ihren Versand übermittelt.
                Auch einen Datenauszug können Sie über diesen Kontakt anfordern.
              </p>
              {privacyMessage && <p role="status" className="text-xs text-amber-200">{privacyMessage}</p>}
              <button type="button" onClick={downloadAccountData} disabled={!authenticated || privacyBusy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/30 text-emerald-300 text-xs font-bold disabled:opacity-50">
                <Download className="w-4 h-4" /> Eigenen Datenauszug herunterladen
              </button>
              <p className="text-xs text-slate-400">
                Der Datenauszug enthält ausschließlich Identitäts- und Sitzungsdaten dieses Dienstes. Er ist kein vollständiger Auskunftsbescheid.
                {!authenticated && <> Für den Download bitte <button type="button" onClick={() => navigate('/login')} className="underline text-emerald-300">mit Supabase Auth anmelden</button>.</>}
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-bold text-white text-emerald-300">Drittanbieter, Drittländer & Beschwerderecht</h2>
              <p>
                Bei Render, Supabase Auth, Google Fonts und bei angefordertem Telegram-Versand können internationale Datenflüsse
                oder Subprozessoren relevant sein. Ein bestimmter AVV-, SCC-, Angemessenheits- oder Hostingstatus wird
                ohne aktuellen Vertragsnachweis nicht behauptet.
              </p>
              <p>
                Sie haben das Recht, sich bei einer zuständigen Datenschutzaufsichtsbehörde zu beschweren. Die konkrete
                Zuständigkeit richtet sich nach den gesetzlichen Regeln.
              </p>
            </section>
          </motion.div>
        )}

        {route === '/agb' && (
          <motion.div lang="de"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 bg-[#070b19]/90 border border-pink-500/20 rounded-3xl p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-[#FF2E93] shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Allgemeine Geschäftsbedingungen</h1>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      Version {TERMS_VERSION}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Gültig ab {TERMS_EFFECTIVE_DATE}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-pink-400 bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                <Scale className="w-3.5 h-3.5" />
                <span>Vertragliche Rahmenbedingungen</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <strong className="text-sm font-bold text-amber-300 block">Hinweis zu Analysefunktionen</strong>
                <p className="leading-relaxed">
                  Die bereitgestellten Berechnungs- und Analysewerkzeuge ersetzen keine individuelle Prüfung,
                  Beratung oder eigene Risikobewertung. Aussagen zum aufsichtsrechtlichen Status einzelner
                  Funktionen sind nicht Bestandteil dieser AGB.
                </p>
              </div>
            </div>

            <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed pt-2">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-pink-300">§ 1 Anbieter, Geltungsbereich und Vertragsgegenstand</h2>
                <p>
                  Anbieter ist {CONTROLLER.name}, natürliche Person, {CONTROLLER.street}, {CONTROLLER.postalCode} {CONTROLLER.city}, {CONTROLLER.country}.
                  CAPITAL-AI ist die Projekt-/Produktbezeichnung der angebotenen Software-Funktionen. Diese AGB
                  gelten für deren Nutzung und, soweit angeboten, für kostenpflichtige Tarife.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-pink-300">§ 2 Nutzungsrechte</h2>
                <p>
                  Nutzer erhalten ein einfaches, nicht übertragbares Nutzungsrecht im Umfang des jeweils
                  freigeschalteten Tarifs. Zugangsdaten, Tokens und Sicherheitsfaktoren dürfen nicht unbefugt
                  weitergegeben werden.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-bold text-white text-pink-300">§ 3 Archivierter Tarifkatalog und bestehende Vertragsverhältnisse</h2>
                <p>
                  Der bisherige Starter-/Pro-/Enterprise-Katalog ist derzeit archiviert und wird nicht als
                  neu bestellbares entgeltliches Angebot dargestellt. Bis zur Veröffentlichung eines neuen
                  Angebots werden für diesen Katalog keine neuen zahlungspflichtigen Bestellungen angeboten.
                </p>
                <p>
                  Für bereits bestehende entgeltliche Vertragsverhältnisse bleiben die bei Vertragsschluss
                  vereinbarten Preise, Leistungsbedingungen und gesetzlichen Rechte maßgeblich. Die Verwaltung
                  bestehender Abonnements sowie Kündigungs-, Widerrufs- und sonstige Verbraucherrechte bleiben
                  unberührt. Für die Verwaltung bestehender Verträge steht der im Impressum genannte Kontakt zur Verfügung;
                  ein Stripe-Kundenportal wird im neuen Dienst nicht als angebunden zugesagt.
                </p>
                <p className="text-[11px] text-slate-500">
                  Der frühere Preiskatalog bleibt ausschließlich als historische Vertrags- und Nachweisevidence erhalten.
                  Ein zukünftiges Pricing-Modell wird durch diese Fassung nicht vorweggenommen.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-pink-300">§ 4 Laufzeit, Verlängerung und Kündigung</h2>
                <p>
                  Bei Abonnements richtet sich die Abrechnungsperiode nach der im Bestellprozess gewählten
                  Monats- oder Jahresoption. Soweit im Bestellprozess nichts Abweichendes ausgewiesen wird,
                  verlängert sich das Abonnement um die jeweils gewählte Abrechnungsperiode, sofern es nicht
                  rechtzeitig beendet wird. Für die Verwaltung bestehender Abonnements kann der im Impressum
                  genannte Kontakt genutzt werden. Gesetzliche Kündigungsrechte bleiben unberührt.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-pink-300">§ 5 Widerruf bei Verbraucherverträgen</h2>
                <p>
                  Verbrauchern steht bei Fernabsatzverträgen, soweit die gesetzlichen Voraussetzungen
                  vorliegen, grundsätzlich ein Widerrufsrecht zu. Die gesetzliche Widerrufsfrist beträgt
                  regelmäßig 14 Tage. Eine eindeutige Erklärung kann an{' '}
                  <a className="text-pink-300 underline" href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a>{' '}
                  gerichtet werden. Gesetzliche Ausnahmen und Erlöschensgründe bleiben unberührt.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-pink-300">§ 6 Daten- und Analysequalität</h2>
                <p>
                  Markt-, Scoring- und Analysefunktionen können von externen Datenquellen, Modellannahmen und
                  technischen Verfügbarkeiten abhängen. Synthetische, Fallback- oder nicht marktdatenbasierte
                  Werte sind in den dafür vorgesehenen Produktbereichen entsprechend zu kennzeichnen.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-pink-300">§ 7 Datenschutz und Sicherheit</h2>
                <p>
                  Personenbezogene Daten werden nach der veröffentlichten Datenschutzerklärung verarbeitet.
                  Die Kenntnisnahme ist keine pauschale Einwilligung in sämtliche Verarbeitungen. Optionale
                  Einwilligungen werden getrennt eingeholt.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-pink-300">§ 8 Änderungen und Dokumentversion</h2>
                <p>
                  Jeder veröffentlichte AGB-Stand wird mit einer Dokumentversion geführt. Änderungen werden
                  nicht allein durch Veröffentlichung rückwirkend Bestandteil bereits geschlossener Verträge.
                </p>
              </section>
            </div>
          </motion.div>
        )}

        {route === '/impressum' && (
          <motion.div lang="de"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 bg-[#070b19]/90 border border-purple-500/20 rounded-3xl p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-[#8D26FF] shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Impressum</h1>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Anbieterkennzeichnung
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Angaben gemäß § 5 DDG</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl self-start sm:self-auto font-mono">
                <span>CAPITAL-AI · Projekt-/Produktbezeichnung</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Rechtlicher Status:</strong> CAPITAL-AI ist eine Projekt-/Produktbezeichnung.
              Anbieter und Verantwortlicher ist {CONTROLLER.name} als natürliche Person.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800/80 space-y-2">
                <h2 className="text-xs font-mono text-purple-400 uppercase tracking-wider">Diensteanbieter</h2>
                <div className="text-sm font-bold text-white">{CONTROLLER.name}</div>
                <div className="text-xs text-slate-300 space-y-0.5">
                  <p>{CONTROLLER.street}</p>
                  <p>{CONTROLLER.postalCode} {CONTROLLER.city}</p>
                  <p>{CONTROLLER.country}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800/80 space-y-2">
                <h2 className="text-xs font-mono text-purple-400 uppercase tracking-wider">Kontaktmöglichkeiten</h2>
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="flex items-center justify-between gap-3"><span className="text-slate-400">Telefon:</span><span className="font-mono text-white">{PUBLIC_CONTACT_PHONE}</span></p>
                  <p className="flex items-center justify-between gap-3"><span className="text-slate-400">E-Mail:</span><a className="font-mono text-purple-300 underline " href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a></p>
                  <p className="flex items-center justify-between gap-3"><span className="text-slate-400">Support:</span><a className="font-mono text-purple-300 underline " href={`mailto:${CONTROLLER.supportEmail}`}>{CONTROLLER.supportEmail}</a></p>
                  <p className="flex items-center justify-between gap-3"><span className="text-slate-400">Web:</span><a className="font-mono text-purple-300 underline" href="/">capital-ai.online</a></p>
                </div>
              </div>
            </div>

            <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed pt-2">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-purple-300">Geschäftsmodell & Transparenz</h2>
                <p>
                  Das Angebot kann kostenlose und kostenpflichtige Tarife sowie gekennzeichnete Partner- oder
                  Referral-Verweise enthalten. Aussagen wie „privat, nicht-kommerziell, keine laufenden Umsätze“
                  werden deshalb nicht als pauschale Anbieterbeschreibung verwendet.
                </p>
                <p>
                  Soweit einzelne Dienste einer besonderen behördlichen Zulassung bedürften, würden die dafür
                  erforderlichen Angaben ergänzt. Die derzeitige Anbieterinformation behauptet keine regulatorische
                  Lizenz oder behördliche Freigabe.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-purple-300">Analysefunktionen</h2>
                <p>
                  Die bereitgestellten Berechnungs- und Analysewerkzeuge ersetzen keine individuelle Prüfung,
                  Beratung oder eigene Risikobewertung. Aussagen zum aufsichtsrechtlichen Status einzelner
                  Funktionen sind nicht Bestandteil dieses Impressums.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-white text-purple-300">Werblicher Partner-/Referral-Hinweis</h2>
                <p>
                  Soweit Referral- oder Partnerlinks eingesetzt werden, können daraus Vorteile oder Provisionen
                  entstehen. Solche Verweise sind als Partner-/Referral-Inhalt zu kennzeichnen und ändern nichts
                  an der eigenverantwortlichen Entscheidung des Nutzers.
                </p>
              </section>
            </div>
          </motion.div>
        )}
      </div>

      <div className="w-full max-w-4xl text-center text-xs text-slate-500 py-6 border-t border-slate-900 0 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} CAPITAL-AI · {CONTROLLER.name}</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/impressum')} className="hover:text-slate-300 cursor-pointer">Impressum</button>
          <span>•</span>
          <button type="button" onClick={() => navigate('/agb')} className="hover:text-slate-300 cursor-pointer">AGB</button>
          <span>•</span>
          <button type="button" onClick={() => navigate('/datenschutz')} className="hover:text-slate-300 cursor-pointer">Datenschutz</button>
          <span>•</span>
          <button type="button" onClick={() => navigate('/faq')} className="hover:text-amber-400 cursor-pointer text-amber-300 font-semibold">FAQ</button>
        </div>
      </div>
    </main>
  );
}
