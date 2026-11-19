import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import skillRegistry from '../../../.agents/skills/registry.json' with { type: 'json' };
import { buildChatFollowUps, classifyChatDomain } from '../chatNextStepPrompts';
import { ChatNextStepActions } from '../../components/ChatNextStepActions';
import { openHeroBuddy, takePendingHeroBuddyOpen } from '../../components/heroBuddyEvents';

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


test('Social channel intent is not hijacked by incidental OAuth or GitHub words', () => {
  assert.equal(classifyChatDomain('Instagram Kampagne mit OAuth Verbindung und GitHub Evidence'), 'GROWTH');
  assert.equal(classifyChatDomain('Erstelle Beitrag auf X und prüfe die API Kosten'), 'GROWTH');
  assert.equal(classifyChatDomain('Repariere Copy Button im Chatfenster und prüfe GitHub CI'), 'PRODUCT');
  assert.equal(classifyChatDomain('Prüfe OAuth tenant isolation beim Docker Deploy'), 'TRUST');
});

test('B2B campaigns use canonical revenue skill and platform-specific social safety contract', () => {
  const scenarios = [
    {task:'Instagram B2B Lead Funnel mit Consent und OAuth Kampagne', required:['INSTAGRAM:', 'B2B:', 'revenue-engineering/SKILL.md']},
    {task:'Erstelle Beitrag auf X mit URL und Asset', required:['X:', 'Owner-OAuth', 'Publisher-Receipt']},
    {task:'Erstelle YouTube Video Kampagne als Entwurf', required:['YOUTUBE:', 'OAuth-Scopes', 'Private-Upload']},
  ];
  for (const {task,required} of scenarios) {
    const steps = buildChatFollowUps(task);
    assert.equal(steps.length, 3);
    assert.equal(steps[0].domain, 'GROWTH');
    for (const term of required) assert.ok(steps[0].prompt.includes(term), task + ' missing ' + term);
    assert.match(steps[0].prompt, /Draft → Review → Asset-Provenance\/SHA-256/);
    assert.match(steps[0].prompt, /kein.*Publishing/i);
    assert.match(steps[0].prompt, /tatsächlich.*Apps/i);
    assert.match(steps[1].prompt, /ausschließlich read-only/);
  }
});

test('pure SEO routing does not invent a social publisher workflow', () => {
  const steps = buildChatFollowUps('Verbessere canonical URLs und sitemap SEO');
  assert.equal(steps[0].domain, 'GROWTH');
  assert.ok(steps[0].skills.includes('seo-engineering'));
  assert.ok(!steps[0].prompt.includes('Publisher-Receipt'));
  assert.ok(!steps[0].prompt.includes('Draft → Review → Asset-Provenance'));
});

test('explicit read-only scope wins over apparent mutating verbs', () => {
  for (const task of [
    'Nur prüfen, nicht implementieren: repariere gegebenenfalls später die OAuth-Konfiguration.',
    'read-only Audit der Social Content Engine, implementiere jetzt nichts.',
    'Keine Änderungen: Bitte Fix und Deployment evaluieren.',
  ]) {
    const steps = buildChatFollowUps(task);
    assert.equal(steps[0].label, 'Read-only prüfen und belegen');
    assert.match(steps[0].prompt, /Untersuche ausschließlich read-only/);
    assert.ok(!steps[0].prompt.includes('Reproduziere den konkreten Fehler, implementiere'));
    assert.ok(!steps[0].prompt.includes('bei belegter Mergefreigabe regulär squash-mergen'));
  }
});

test('recognizable tokens from multiple providers are not repeated into the clipboard prompt', () => {
  const secrets = [
    'github_pat_abcdefghijklmnop123456',
    'ghp_abcdefghijklmnop123456',
    'sk_live_abcdefghijklmnop123456',
    'sk-proj-abcdefghijklmnop123456',
    'AIzaabcdefghijklmnop123456789012345',
    'xoxb-123456789012-123456789012',
    'AKIAABCDEFGHIJKLMNOP',
  ];
  for (const secret of secrets) {
    const steps = buildChatFollowUps('Bitte kopiere ' + secret + ' in den Kampagnen-Prompt.');
    assert.equal(steps.length, 3);
    assert.ok(steps.every(s => s.prompt.includes('[SECRET_ENTFERNT]')), 'secret prefix ' + secret.slice(0, 5));
    assert.ok(steps.every(s => !s.prompt.includes(secret)), 'secret leak ' + secret.slice(0, 5));
  }
});

test('lazy JaJa open events are replayed once, including a click before module mount', () => {
  assert.equal(takePendingHeroBuddyOpen(), false);
  openHeroBuddy();
  assert.equal(takePendingHeroBuddyOpen(), true);
  assert.equal(takePendingHeroBuddyOpen(), false);
});
