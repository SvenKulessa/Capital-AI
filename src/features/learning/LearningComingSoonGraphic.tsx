import React from 'react';
/** Original vector art, no third-party imagery. Shared by UI and social drafts. */
export function LearningComingSoonGraphic({ category }: { category: string }) {
  const gradientId=`learning-glow-${category.toLowerCase().replace(/[^a-z0-9]/g,'-')}`;
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label={`${category}: Coming soon, Rakete und Sternschnuppe`}>
    <title>{`${category} · Coming soon`}</title><desc>Eigene goldene Rakete und Sternschnuppe auf dunkelblauem Badge-Hintergrund.</desc>
    <defs><radialGradient id={gradientId}><stop stopColor="#fbbf24" stopOpacity=".18"/><stop offset="1" stopColor="#080d1c"/></radialGradient></defs>
    <rect width="640" height="360" rx="28" fill="#080d1c"/><rect x="10" y="10" width="620" height="340" rx="24" fill={`url(#${gradientId})`} stroke="#fbbf24" strokeOpacity=".4"/>
    <g fill="none" stroke="#fcd34d" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M290 205 Q278 135 344 90 Q363 154 310 210 Z"/><path d="M285 162 L252 180 L270 213 L294 202 M328 173 L346 201 L313 222 L305 208"/>
      <circle cx="322" cy="140" r="12"/><path d="M281 218 L265 247 M299 224 L288 252"/>
      <path d="M414 84 L420 101 L438 104 L423 115 L425 133 L411 121 L394 128 L401 112 L391 98 L409 99 Z"/>
      <path d="M383 119 L351 139 M381 130 L362 143" strokeOpacity=".5"/>
    </g>
    <g fill="#fcd34d" fontFamily="system-ui,sans-serif" textAnchor="middle"><text x="320" y="288" fontSize="28" fontWeight="700">COMING SOON</text><text x="320" y="323" fontSize="20">{category}</text></g>
  </svg>;
}
