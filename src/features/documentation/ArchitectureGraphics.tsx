import React from 'react';

type DiagramNode = { id: string; name: string; type: string; tier: string };

export function SocialMediaArchitectureDiagram({ title, nodes }: { title: string; nodes: DiagramNode[] }) {
  const visible = nodes.slice(0, 4);
  const positions = visible.map((_, index) => 150 + index * (900 / Math.max(1, visible.length - 1)));
  return (
    <svg viewBox="0 0 1200 630" role="img" aria-label={`Architekturdiagramm ${title}`} className="aspect-[1200/630] w-full bg-[#040916]">
      <defs>
        <linearGradient id="doc-grid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F5B014" stopOpacity="0.14"/><stop offset="1" stopColor="#22D3EE" stopOpacity="0.04"/></linearGradient>
        <marker id="doc-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#F5B014"/></marker>
      </defs>
      <rect width="1200" height="630" fill="#040916"/><rect x="36" y="36" width="1128" height="558" rx="30" fill="url(#doc-grid)" stroke="#1e293b"/>
      <text x="72" y="96" fill="#F8FAFC" fontSize="30" fontWeight="700">{title}</text><text x="72" y="130" fill="#94A3B8" fontSize="16">CAPITAL-AI · SocialMediaEngine 1200×630 architecture profile</text>
      {visible.map((node, index) => { const x = positions[index]; const nextX = positions[index + 1]; return <g key={node.id}>{index < visible.length - 1 && <line x1={x + 100} y1="330" x2={nextX - 100} y2="330" stroke="#F5B014" strokeWidth="4" markerEnd="url(#doc-arrow)" opacity="0.85"/>}<rect x={x - 105} y="238" width="210" height="184" rx="22" fill="#071127" stroke="#334155"/><rect x={x - 83} y="260" width="166" height="28" rx="14" fill="#F5B014" fillOpacity="0.12" stroke="#F5B014" strokeOpacity="0.35"/><text x={x} y="279" textAnchor="middle" fill="#FCD34D" fontSize="12" fontWeight="700">{node.tier} · {node.type}</text><text x={x} y="325" textAnchor="middle" fill="#F8FAFC" fontSize="15" fontWeight="700">{node.name.length > 26 ? `${node.name.slice(0, 26)}…` : node.name}</text><circle cx={x} cy="374" r="8" fill="#22D3EE"/></g>; })}
      <text x="72" y="550" fill="#64748B" fontSize="14">Deterministische lokale Vektorgrafik · keine externen Bildassets · Architekturprofil nach vorhandenen SocialMediaEngine-Verträgen</text>
    </svg>
  );
}

export function ByokArchitectureDiagram() {
  const boxes = [['Browser / Profil', 'authentifiziert · same-origin'], ['BYOK API / BFF', 'allowlist · validation'], ['Supabase Vault', 'service_role only'], ['Kraken Private API', 'Balance · read-only']] as const;
  return (
    <svg viewBox="0 0 1200 630" role="img" aria-label="BYOK Sicherheitsarchitektur" className="w-full rounded-2xl border border-slate-800 bg-[#040916]">
      <defs><marker id="byok-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#22D3EE"/></marker></defs>
      <rect width="1200" height="630" fill="#040916"/><text x="70" y="88" fill="#F8FAFC" fontSize="30" fontWeight="700">BYOK · USER_PRIVATE_ACCOUNT_DATA</text><text x="70" y="120" fill="#94A3B8" fontSize="16">Secret-Grenze getrennt vom öffentlichen MARKET Source Admission Pfad</text>
      {boxes.map(([name, note], index) => { const x = 155 + index * 295; return <g key={name}>{index < boxes.length - 1 && <line x1={x + 105} y1="292" x2={x + 190} y2="292" stroke="#22D3EE" strokeWidth="4" markerEnd="url(#byok-arrow)"/>}<rect x={x - 105} y="220" width="210" height="144" rx="22" fill="#071127" stroke="#155E75"/><text x={x} y="277" textAnchor="middle" fill="#CFFAFE" fontSize="17" fontWeight="700">{name}</text><text x={x} y="311" textAnchor="middle" fill="#94A3B8" fontSize="12">{note}</text></g>; })}
      <rect x="310" y="425" width="580" height="82" rx="18" fill="#3F1D1D" fillOpacity="0.55" stroke="#F87171" strokeOpacity="0.5"/><text x="600" y="458" textAnchor="middle" fill="#FCA5A5" fontSize="16" fontWeight="700">Keine Rechte-Eskalation</text><text x="600" y="486" textAnchor="middle" fill="#CBD5E1" fontSize="13">kein Public Display · kein Shared Cache · kein JetStream · kein Redistribution · kein Market-Score-Input</text>
      <text x="70" y="566" fill="#64748B" fontSize="14">SocialMediaEngine 1200×630 profile · lokal · deterministisch · ohne externe Publishing-Authority</text>
    </svg>
  );
}
