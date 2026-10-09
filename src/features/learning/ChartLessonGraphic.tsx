import React from 'react';
import { CHART_LEARNING_DISCLOSURE, type ChartLesson } from '../../data/chartLearning.ts';

/** Same deterministic SVG is used in the website and the offline social export. */
export function ChartLessonGraphic({ lesson }: { lesson: ChartLesson }) {
  const x = (index: number) => 115 + index * 80;
  const y = (value: number) => 480 - (value - lesson.domain[0]) / (lesson.domain[1] - lesson.domain[0]) * 300;
  const colors = ['#67e8f9', '#fcd34d'];
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img"
    aria-label={`${lesson.title}. ${lesson.recognition} ${CHART_LEARNING_DISCLOSURE}`} className="h-auto w-full rounded-xl">
    <title>{`${lesson.title} · synthetisches Lernbeispiel`}</title>
    <desc>{lesson.recognition} {lesson.confirmation} {lesson.invalidation}</desc>
    <rect width="1200" height="675" rx="24" fill="#080d1c" />
    <g fontFamily="system-ui, sans-serif">
      <text x="60" y="48" fill="#fcd34d" fontSize="22">CAPITAL-AI · CHART-LERNATLAS</text>
      <text x="60" y="96" fill="#f1f5f9" fontSize="34" fontWeight="700">{lesson.title}</text>
      <text x="60" y="134" fill="#cbd5e1" fontSize="21">{lesson.axis}</text>
      {[0, .25, .5, .75, 1].map(fraction => {
        const value = lesson.domain[0] + fraction * (lesson.domain[1] - lesson.domain[0]);
        return <g key={fraction}>
          <line x1="115" x2="1075" y1={y(value)} y2={y(value)} stroke="#334155" />
          <text x="95" y={y(value) + 7} textAnchor="end" fill="#cbd5e1" fontSize="20">{value}</text>
        </g>;
      })}
      {lesson.guides.map((guide, index) => <g key={guide.label}>
        <line x1={x(guide.from[0])} y1={y(guide.from[1])} x2={x(guide.to[0])} y2={y(guide.to[1])}
          stroke="#c4b5fd" strokeWidth="3" strokeDasharray="8 6" />
        <text x={60 + index * 420} y="565" fill="#ddd6fe" fontSize="22">{index + 1}. {guide.label}</text>
      </g>)}
      {lesson.series.map((series, index) => <g key={series.label}>
        <polyline points={series.values.map((value, i) => `${x(i)},${y(value)}`).join(' ')}
          fill="none" stroke={colors[index]} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={series.dashed ? '12 8' : undefined} />
        <line x1={60 + index * 270} x2={95 + index * 270} y1="522" y2="522" stroke={colors[index]} strokeWidth="4"
          strokeDasharray={series.dashed ? '8 5' : undefined} />
        <text x={110 + index * 270} y="530" fill={colors[index]} fontSize="22">{series.label}</text>
      </g>)}
      <text x="1075" y="520" textAnchor="end" fill="#cbd5e1" fontSize="20">Zeit →</text>
      <text x="60" y="617" fill="#e2e8f0" fontSize="20">{CHART_LEARNING_DISCLOSURE}</text>
      <text x="60" y="650" fill="#94a3b8" fontSize="19">Schematische Geometrie · keine berechneten Signale · capital-ai.online/learning</text>
    </g>
  </svg>;
}
