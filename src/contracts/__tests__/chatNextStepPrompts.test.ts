import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import skillRegistry from '../../../.agents/skills/registry.json' with { type: 'json' };
import { buildChatFollowUps, classifyChatDomain } from '../chatNextStepPrompts';
import { ChatNextStepActions } from '../../components/ChatNextStepActions';

test('the chat windows share three short labelled copy actions with screenreader feedback', () => {
  const html = renderToStaticMarkup(React.createElement(ChatNextStepActions, {
    task: 'Behebe den Chat Layout Fehler auf Mobilgeräten.',
    compact: true,
  }));
  assert.match(html, /Nächste Schritte/);
  assert.equal((html.match(/Prompt kopieren<\/button>/g) || []).length, 3);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /min-h-11/);
  assert.match(html, /role="status"/);
  assert.match(html, /focus-visible:outline/);
});

test('an empty task does not fabricate follow-up actions', () => {
  assert.deepEqual(buildChatFollowUps('   '), []);
  assert.equal(renderToStaticMarkup(React.createElement(ChatNextStepActions, { task: '' })), '');
});

test('task signals select registered skills without claiming connection or approval', () => {
  const steps = buildChatFollowUps('GA4 Attribution und Instagram Social Content Kampagne erstellen');
  assert.equal(steps.length, 3);
  assert.ok(steps.every(step => step.domain === 'GROWTH'));
  assert.ok(steps.every(step => step.skills.includes('growth-engineering')));
  assert.ok(steps.some(step => step.skills.includes('analytics-intelligence')));
  assert.ok(steps.every(step => step.prompt.includes('src/platform/SocialMediaEngine')));
  assert.ok(steps.every(step => step.prompt.includes('kein ungeprüftes Publishing')));
  assert.ok(steps.every(step => step.prompt.includes('LangGraph')));
  assert.ok(steps.every(step => step.prompt.includes('MULTI') === false));
});

test('registered skills resolve to canonical metadata, not guessed plugins or a second authority', () => {
  const domain = classifyChatDomain('Prüfe OAuth tenant isolation beim Docker Deploy');
  assert.equal(domain, 'TRUST');
  for (const task of [
    'Implementiere UI und Screenreader in Chat',
    'Risikoprüfung mit DSGVO und Secrets',
    'Render Docker Security Gate',
    'X Social Content Engine Kampagne',
    'Portfolio Backtest',
  ]) {
    const results = buildChatFollowUps(task);
    assert.equal(results.length, 3);
    assert.deepEqual(results.map(result => result.id), ['execute', 'audit', 'verify']);
    assert.ok(results.every(result => result.skills.every(skill =>
      Object.hasOwn(skillRegistry.skillGovernance, skill) && result.prompt.includes('.agents/skills/' + skill + '/SKILL.md'))));
    assert.ok(results.every(result => result.prompt.includes('Root-AGENTS.md')));
  }
});

test('untrusted credential-shaped text is removed and follow-up copying never performs privileged actions', () => {
  const steps = buildChatFollowUps('Bitte nutze token=ghp_abcdefgh1234567890 für meine Chat App');
  assert.equal(steps.length, 3);
  assert.ok(steps.every(step => step.prompt.includes('[SECRET_ENTFERNT]')));
  assert.ok(steps.every(step => !step.prompt.includes('ghp_abcdefgh1234567890')));
  assert.ok(steps.every(step => step.prompt.includes('Keine neuen Kosten')));
  assert.ok(steps.every(step => step.prompt.includes('GitHub-Rulesets')));
});
