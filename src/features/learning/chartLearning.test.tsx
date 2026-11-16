import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHART_LESSONS, CHART_LEARNING_DISCLOSURE, lessonPost } from '../../data/chartLearning.ts';
import { ChartLessonGraphic, resolveChartUniversePalette } from './ChartLessonGraphic.tsx';
import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import { ChartLearningAtlas } from './ChartLearningAtlas.tsx';
import { LearningCadsShowcase } from '../home/LearningCadsShowcase.tsx';
import { validateMediaProjectV2 } from '../../platform/SocialMediaEngine/Contracts/MediaProjectValidation.ts';

const directory = new URL('../../../public/learning/charts/', import.meta.url);
const read = (name:string) => readFileSync(new URL(name,directory));
const digest = (value:Uint8Array) => createHash('sha256').update(value).digest('hex');
const spectrum = ['cyan', 'violet', 'gold', 'pink', 'rose', 'blue', 'green'] as const;

test('seven-colour Universe signature is complete, deterministic and fail-closed', () => {
  assert.deepEqual(resolveChartUniversePalette(), spectrum.map(name => BRAND_COLORS[name]));
  const missing:Record<string,unknown> = {...BRAND_COLORS}; delete missing.green;
  for (const corrupted of [
    missing,
    {...BRAND_COLORS, green:BRAND_COLORS.cyan},
    {...BRAND_COLORS, green:'url(https://untrusted.example)'},
    {...BRAND_COLORS, injected:'#123456'},
  ]) assert.throws(() => resolveChartUniversePalette(corrupted), /UNIVERSE_PALETTE_SEVEN_REQUIRED/);
});

test('every learning example has bounded geometry, explanations and no claimed live signal',()=>{
  assert.equal(CHART_LESSONS.length,52);
  assert.equal(new Set(CHART_LESSONS.map(item=>item.id)).size,52);
  for(const lesson of CHART_LESSONS){
    assert.match(lesson.id,/^[a-z0-9-]+$/);
    assert.ok(lesson.domain[0]<lesson.domain[1]);
    for(const series of lesson.series){
      assert.equal(series.values.length,13);
      assert.ok(series.values.every(value=>Number.isFinite(value)&&value>=lesson.domain[0]&&value<=lesson.domain[1]));
    }
    for(const guide of lesson.guides) for(const [index,value] of [guide.from,guide.to]){
      assert.ok(index>=0&&index<=12&&Number.isInteger(index));
      assert.ok(value>=lesson.domain[0]&&value<=lesson.domain[1]);
    }
    for(const text of [lesson.recognition,lesson.confirmation,lesson.invalidation,lesson.answer]) assert.ok(text.length>30);
    assert.ok(lessonPost(lesson).includes(CHART_LEARNING_DISCLOSURE));
    assert.ok(lessonPost(lesson).includes(`lesson=${lesson.id}`));
    const svg=renderToStaticMarkup(<ChartLessonGraphic lesson={lesson}/>);
    assert.match(svg,/role="img"/);
    assert.match(svg,/<title>.+<\/title>/);
    assert.match(svg,/keine berechneten Signale/);
    assert.doesNotMatch(svg,/<script|<foreignObject|\bon\w+=|href=/i);
    assert.match(svg, /data-universe-spectrum="CAPITAL_AI_UNIVERSE@1"/);
    for (const colour of spectrum) {
      assert.ok(svg.includes(`fill="${BRAND_COLORS[colour]}"`), 'missing Universe hue: ' + colour);
    }
  }
  assert.deepEqual(CHART_LESSONS.find(item=>item.id==='rsi')?.domain,[0,100]);
  assert.ok(CHART_LESSONS.find(item=>item.id==='macd')!.domain[0]<0);
});

test('static social exports match source, asset hashes and canonical non-publishing MediaProject contract',()=>{
  execFileSync(process.execPath,['--import','tsx','scripts/generate-chart-learning.tsx','--check']);
  const manifest=JSON.parse(read('manifest.json').toString());
  assert.equal(manifest.publishReady,false);
  assert.equal(manifest.dataProvenance,'SELF_AUTHORED_SYNTHETIC');
  assert.equal(manifest.assets.length,52);
  for(const asset of manifest.assets){
    assert.equal(digest(read(asset.path)),asset.sha256);
    const svg = read(asset.path).toString();
    assert.match(svg, /<g aria-hidden="true" data-universe-spectrum="CAPITAL_AI_UNIVERSE@1">/);
    assert.equal((svg.match(/<circle /g) ?? []).length, 7);
    assert.doesNotMatch(svg, /<(script|foreignObject|image)\b|(?:href|src)="https?:/i);
    for (const family of spectrum) assert.ok(svg.includes(`fill="${BRAND_COLORS[family]}"`));
    assert.equal(digest(read(asset.projectPath)),asset.projectSha256);
    const project=JSON.parse(read(asset.projectPath).toString());
    assert.deepEqual(validateMediaProjectV2(project).errors,[]);
    assert.equal(project.renderRecipe.publishReady,false);
    assert.equal(project.renderRecipe.networkPolicy,'offline');
    assert.equal(project.metadata.videoRendered,false);
  }
  const pngs=JSON.parse(read('png-manifest.json').toString());
  assert.equal(pngs.publishReady,false);
  assert.equal(pngs.sourceManifestSha256,digest(read('manifest.json')));
  assert.equal(pngs.assets.length,52);
  for(const asset of pngs.assets){
    const bytes=read(asset.path);
    assert.equal(digest(bytes),asset.sha256);
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
    assert.equal(bytes.readUInt32BE(16),1200);
    assert.equal(bytes.readUInt32BE(20),675);
  }
});

test('atlas is public learning content, studio export stays a draft, postponed engine promotion stays hidden',()=>{
  const publicAtlas=renderToStaticMarkup(<ChartLearningAtlas/>);
  assert.match(publicAtlas,/Selbstcheck/);
  assert.match(publicAtlas,/Kategorie filtern/);
  assert.match(publicAtlas,/PNG herunterladen/);
  assert.doesNotMatch(publicAtlas,/MediaProject herunterladen/);
  const studio=renderToStaticMarkup(<ChartLearningAtlas studio/>);
  assert.match(studio,/keine Social-Veröffentlichung/);
  assert.match(studio,/MediaProject herunterladen/);
  const showcase=renderToStaticMarkup(<LearningCadsShowcase onNavigate={()=>{}} onPricing={()=>{}}/>);
  assert.equal(showcase, '');
  assert.doesNotMatch(showcase,/Jetzt kaufen|Renditegarantie|control-center/);
});
