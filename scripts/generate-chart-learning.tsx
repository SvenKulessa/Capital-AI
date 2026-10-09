import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CHART_LESSONS, CHART_LEARNING_CAMPAIGN, CHART_LEARNING_DISCLOSURE, CHART_LEARNING_SOURCE_SHA, lessonPost } from '../src/data/chartLearning.ts';
import { ChartLessonGraphic } from '../src/features/learning/ChartLessonGraphic.tsx';
import { MEDIA_PROJECT_BRAND_TOKEN_SOURCE, type MediaProjectV2 } from '../src/platform/SocialMediaEngine/Contracts/MediaProject.ts';
import { validateMediaProjectV2 } from '../src/platform/SocialMediaEngine/Contracts/MediaProjectValidation.ts';
import { ContentCampaignBriefSchema } from '../src/contracts/contentEngine.ts';

const directory = new URL('../public/learning/charts/', import.meta.url);
const check = process.argv.includes('--check');
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function save(name: string, value: string) {
  const file = new URL(name, directory);
  if (check) {
    if (readFileSync(file,'utf8') !== value) throw new Error(`CHART_ASSET_DRIFT:${name}`);
  } else { mkdirSync(directory, { recursive: true }); writeFileSync(file,value); }
}
const json = (value: unknown) => JSON.stringify(value,null,2)+'\n';
ContentCampaignBriefSchema.parse(CHART_LEARNING_CAMPAIGN);
const assets = CHART_LESSONS.map(lesson=> {
  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n'+renderToStaticMarkup(<ChartLessonGraphic lesson={lesson} />)+'\n';
  save(`${lesson.id}.svg`,svg);
  const project: MediaProjectV2 = {
    schemaVersion:'2.0.0',projectId:`chart-${lesson.id}`,slug:lesson.id,title:lesson.title,
    contentPackageId:CHART_LEARNING_CAMPAIGN.campaignId,timebase:{numerator:30,denominator:1},
    canvas:{width:1200,height:675,aspectRatio:'16:9'},durationFrames:360,
    tracks:[{id:'graphic',kind:'graphics',enabled:true,layers:[{id:'chart',kind:'image',enabled:true,
      range:{startFrame:0,durationFrames:360},assetRefId:'chart-svg',fit:'contain'}]}],
    assets:[{id:'chart-svg',kind:'image',sourceType:'local-file',reference:`public/learning/charts/${lesson.id}.svg`,
      sha256:hash(svg),mimeType:'image/svg+xml',width:1200,height:675}],transitions:[],
    renderRecipe:{templateId:'chart-learning-svg',templateVersion:'1.0.0',rendererProfile:'chart-learning-svg-v1',
      brandTokenSource:MEDIA_PROJECT_BRAND_TOKEN_SOURCE,brandTextMode:'deterministic',networkPolicy:'offline',publishReady:false},
    source:{type:'content-package',reference:'src/data/chartLearning.ts'},
    disclosure:{defaultDisclaimer:CHART_LEARNING_DISCLOSURE,requireAtProjectEdges:true},
    metadata:{draftOnly:true,synthetic:true,sourceSha:CHART_LEARNING_SOURCE_SHA,
      outputStatus:'SVG_RENDERED_MEDIA_PROJECT_DRAFT',videoRendered:false},
  };
  const result=validateMediaProjectV2(project);
  if(!result.ok) throw new Error(JSON.stringify(result.errors));
  const projectJson=json(project);
  save(`${lesson.id}.media-project.json`,projectJson);
  return {id:lesson.id,path:`${lesson.id}.svg`,sha256:hash(svg),mimeType:'image/svg+xml',width:1200,height:675,
    projectPath:`${lesson.id}.media-project.json`,projectSha256:hash(projectJson),post:lessonPost(lesson),state:'DRAFT',graphic:{title:lesson.title,axis:lesson.axis,domain:lesson.domain,series:lesson.series,guides:lesson.guides}};
});
save('campaign.json',json(CHART_LEARNING_CAMPAIGN));
save('manifest.json',json({schemaVersion:'CAPITAL_AI_CHART_LEARNING@1',sourceSha:CHART_LEARNING_SOURCE_SHA,
  contentSource:'src/data/chartLearning.ts',renderer:'src/features/learning/ChartLessonGraphic.tsx',
  dataProvenance:'SELF_AUTHORED_SYNTHETIC',publishReady:false,networkAccess:false,assets}));
console.log(`${check?'Verified':'Generated'} ${assets.length} chart graphics and MediaProject drafts.`);
