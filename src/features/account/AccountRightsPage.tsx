import { AccountPageShell } from './AccountPageShell';
import { ProductDisclaimer } from '../../components/ProductDisclaimer';
import { LearningEntitlementBadge } from '../learning/LearningEntitlementBadge';
import { accountDisplay } from '../../../shared/account-display.mjs';
export function AccountRightsPage({onNavigate}:{onNavigate:(path:string)=>void}) {
  return <AccountPageShell active="/profile/rights" title="Konto & Rechte" description="Dein Zugang, Vertragsinformationen und Nutzungsbedingungen an einem Ort." onNavigate={onNavigate}>{session => <section className="space-y-5 rounded-2xl border border-slate-700 bg-brand-canvas p-5">
    <h2 className="text-xl font-bold text-white">Dein Zugang: {accountDisplay(session)}</h2>
    <p className="text-base leading-7 text-slate-300">{session.account?.iamRole === 'owner' ? 'Owner ist deine Verwaltungsrolle. Abonnements und kostenpflichtige Dienste werden unabhängig davon verwaltet.' : 'Dein Tarif und dein Lernzugang bestimmen die verfügbaren Funktionen.'}</p>
    <LearningEntitlementBadge />
    <p className="text-base leading-7 text-slate-300">Alle Glossarbegriffe sind öffentlich. Der Lernzugang umfasst erweiterte Übungen. Der Chart-Lernatlas setzt zusätzlich ein aktives Starter-, Pro- oder Enterprise-Abo voraus; Chart-Training benötigt Pro oder Enterprise.</p>
    <div className="grid gap-3 sm:grid-cols-2">{[{path:'/profile/subscription',label:'Abonnement verwalten'},{path:'/agb',label:'AGB & Verbraucherrechte'},{path:'/datenschutz',label:'Datenschutz & Einwilligungen'},{path:'/legal',label:'Alle rechtlichen Informationen'}].map(item => <a key={item.path} href={item.path} className="hub-tab justify-start border border-slate-600">{item.label} →</a>)}</div>
    <ProductDisclaimer full kind="marketing" /><ProductDisclaimer full kind="commerce" /><ProductDisclaimer full kind="scoring" />
  </section>}</AccountPageShell>;
}
