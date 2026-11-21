import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Compass, Network, ShieldCheck, Workflow } from 'lucide-react';
import './SkillRoutingPanel.css';

const domainIcons = { PRODUCT: Compass, MARKET: BarChart3, PLATFORM: Workflow, TRUST: ShieldCheck, GROWTH: Network };
type DomainId = keyof typeof domainIcons;
type Domain = {
  id: DomainId;
  label: string;
  scope: string;
  advisers: { skill: string; focus: string }[];
  recommendedDomains: DomainId[];
};

function isDomainId(value: unknown): value is DomainId {
  return typeof value === 'string' && Object.hasOwn(domainIcons, value);
}

function readDomains(body: unknown, userId: string): Domain[] {
  const catalog = body as { schema?: string; userId?: string; domains?: Domain[] } | null;
  if (catalog?.schema !== 'CAPITAL_AI_ADVISORY_ROUTING@1' || catalog.userId !== userId ||
      !Array.isArray(catalog.domains) || catalog.domains.length !== 5 ||
      new Set(catalog.domains.map(item => item?.id)).size !== 5 ||
      !catalog.domains.every(domain => domain && isDomainId(domain.id) &&
        typeof domain.label === 'string' && typeof domain.scope === 'string' &&
        Array.isArray(domain.advisers) && domain.advisers.length > 0 &&
        domain.advisers.every(item => item && typeof item.skill === 'string' && typeof item.focus === 'string') &&
        Array.isArray(domain.recommendedDomains) && domain.recommendedDomains.every(isDomainId))) {
    throw new Error('invalid routing catalog');
  }
  return catalog.domains;
}

export function SkillRoutingPanel({ userId }: { userId: string }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [primaryId, setPrimaryId] = useState<DomainId>('PRODUCT');
  const [related, setRelated] = useState<DomainId[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setDomains([]);
    setError('');
    fetch('/api/profile/skill-routing', {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).then(async response => {
      if (response.status === 404) {
        if (!controller.signal.aborted) setError('Dein Konto hat derzeit keinen Zugriff auf das Skill-Routing.');
        return;
      }
      if (!response.ok) throw new Error('unavailable');
      const result = readDomains(await response.json(), userId);
      if (!controller.signal.aborted) setDomains(result);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Das Skill-Routing konnte nicht geladen werden.');
    });
    return () => controller.abort();
  }, [reload, userId]);

  const primary = domains.find(domain => domain.id === primaryId);
  const selectedDomains = domains.filter(domain => related.includes(domain.id));

  function toggleDomain(id: DomainId) {
    setRelated(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  return (
    <section className="skill-route" aria-labelledby="skill-route-heading">
      <header className="skill-route__header">
        <span className="skill-route__mark"><Workflow aria-hidden="true" size={22} /></span>
        <div>
          <h2 id="skill-route-heading">Domain- und Skill-Routing</h2>
          <p>Wähle eine Primärdomain und ergänze die Beratung aus weiteren Domains.</p>
        </div>
      </header>
      {error && <div className="skill-route__message" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => setReload(value => value + 1)}>Erneut laden</button>
      </div>}
      {!primary && !error && <p role="status" className="skill-route__message">Routing-Katalog wird geladen …</p>}
      {primary && <>
        <div className="skill-route__canvas">
          <div className="skill-route__stage">
            <h3>Primärdomain</h3>
            <div role="group" aria-label="Primärdomain wählen" className="skill-route__nodes">
              {domains.map(domain => {
                const Icon = domainIcons[domain.id];
                return <button type="button" key={domain.id} aria-pressed={primaryId === domain.id}
                  className="skill-route__node"
                  onClick={() => {
                    setPrimaryId(domain.id);
                    setRelated(current => current.filter(id => id !== domain.id));
                  }}>
                  <Icon aria-hidden="true" size={18} />
                  <span><strong>{domain.id}</strong><small>{domain.label}</small></span>
                </button>;
              })}
            </div>
          </div>
          <div className="skill-route__edge" aria-hidden="true"><ArrowRight size={20} /></div>
          <div className="skill-route__stage skill-route__stage--advisers">
            <h3>Berater-Skills</h3>
            <div className="skill-route__decision">
              <strong>{primary.id}</strong>
              <p>{primary.label}</p>
            </div>
            <ul className="skill-route__skills">
              {primary.advisers.map(item => <li key={item.skill}>
                <strong>{item.skill}</strong>
                <span>{item.focus}</span>
              </li>)}
            </ul>
          </div>
          <div className="skill-route__edge" aria-hidden="true"><ArrowRight size={20} /></div>
          <div className="skill-route__stage">
            <h3>Weitere Domains</h3>
            <div role="group" aria-label="Weitere Domains hinzunehmen" className="skill-route__nodes">
              {domains.filter(domain => domain.id !== primaryId).map(domain => {
                const Icon = domainIcons[domain.id];
                const recommended = primary.recommendedDomains.includes(domain.id);
                return <button type="button" key={domain.id} aria-pressed={related.includes(domain.id)}
                  className="skill-route__node" onClick={() => toggleDomain(domain.id)}>
                  <Icon aria-hidden="true" size={18} />
                  <span><strong>{domain.id}</strong><small>{recommended ? 'Empfohlen' : domain.label}</small></span>
                </button>;
              })}
            </div>
          </div>
        </div>
        <div className="skill-route__result">
          <h3>Ausgewählte Route</h3>
          <p role="status" className="skill-route__path">
            {primary.id}{selectedDomains.length ? ' → ' + selectedDomains.map(domain => domain.id).join(' · ') : ''}
          </p>
          <p>{primary.scope}</p>
          {selectedDomains.length > 0 && <div className="skill-route__tracks">
            {selectedDomains.map(domain => <article key={domain.id}>
              <h4>{domain.id} · {domain.label}</h4>
              <ul className="skill-route__skills">
                {domain.advisers.map(item => <li key={item.skill}>
                  <strong>{item.skill}</strong><span>{item.focus}</span>
                </li>)}
              </ul>
            </article>)}
          </div>}
        </div>
      </>}
    </section>
  );
}
