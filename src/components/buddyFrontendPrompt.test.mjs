import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFrontendDesignPrompt, FRONTEND_FEATURES} from './buddyFrontendPrompt.mjs';

test('selected saved notes become domain-accurate private frontend brief',()=>{
  const prompt=buildFrontendDesignPrompt({notes:['Hub Navigation kompakter','Nachrichten mit Infografiken'],featureIds:['responsive','charts'],images:['Screenshot-01.png']});
  assert.match(prompt,/CSS Grid\/Flexbox/);
  assert.match(prompt,/320\/390\/1440 CSS-px/);
  assert.match(prompt,/Daten-Provenienz/);
  assert.match(prompt,/Hub Navigation kompakter/);
  assert.match(prompt,/Screenshot-01\.png/);
  assert.doesNotMatch(prompt,/Sieben kanonische Akzentfarben/);
});
test('reject unknown and empty notes/features rather than generate unverifiable content',()=>{
  for(const opts of [
    {notes:[],featureIds:['responsive']},
    {notes:[' '],featureIds:['responsive']},
    {notes:['Text'],featureIds:[]},
    {notes:['Text'],featureIds:['auth-bypass']},
    {notes:['A'.repeat(501)],featureIds:['responsive']},
  ])assert.throws(()=>buildFrontendDesignPrompt(opts));
  assert.ok(FRONTEND_FEATURES.every(f=>f.label&&f.spec));
});
