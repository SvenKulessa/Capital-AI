import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { LearningComingSoonGraphic } from '../src/features/learning/LearningComingSoonGraphic';
import { VIDEO_CATEGORIES } from '../src/features/learning/LearningVideos';
import { MEDIA_PROJECT_BRAND_TOKEN_SOURCE, type MediaProjectV2 } from '../src/platform/SocialMediaEngine/Contracts/MediaProject';
import { validateMediaProjectV2 } from '../src/platform/SocialMediaEngine/Contracts/MediaProjectValidation';
import { ContentCampaignBriefSchema } from '../src/contracts/contentEngine';
const out=new URL('../public/learning/videos/',import.meta.url);mkdirSync(out,{recursive:true});
const sourceSha=process.env.LEARNING_ASSET_SOURCE_SHA || '';
if(!/^[a-f0-9]{40}$/.test(sourceSha||'')) throw new Error('LEARNING_ASSET_SOURCE_SHA required');
const campaign=ContentCampaignBriefSchema.parse({campaignId:'learning-videos-coming-soon-20261009',productId:'capital-ai-learning',sourceSha,canonicalUrl:'https://capital-ai.online/learning?tab=videos',locale:'de-DE',objective:'Eigene Coming-soon-Grafiken mit Rakete und Sternschnuppe für drei öffentliche Lernvideo-Kategorien.',audience:['Finanzlernende','Fintech-Entwickler'],channels:['WEBSITE','YOUTUBE'],outputs:['TEXT','IMAGE'],sourceUrls:['https://capital-ai.online/learning?tab=videos']});
writeFileSync(new URL('campaign.json',out),JSON.stringify(campaign,null,2)+'\n');
VIDEO_CATEGORIES.forEach((category,index)=>{
 const slug=['architektur','fintech-deepdive','social'][index];
 const svg=renderToStaticMarkup(<LearningComingSoonGraphic category={category}/>);
 writeFileSync(new URL(`${slug}.svg`,out),svg+'\n');
 const project:MediaProjectV2={schemaVersion:'2.0.0',projectId:`learning-video-${slug}`,slug:`learning-video-${slug}`,title:`${category} · Coming soon`,contentPackageId:campaign.campaignId,timebase:{numerator:30,denominator:1},canvas:{width:640,height:360,aspectRatio:'16:9'},durationFrames:90,
 tracks:[{id:'graphic',kind:'graphics',enabled:true,layers:[{id:'coming-soon',kind:'image',enabled:true,range:{startFrame:0,durationFrames:90},assetRefId:'art',fit:'contain'}]}],
 assets:[{id:'art',kind:'image',sourceType:'local-file',reference:`public/learning/videos/${slug}.svg`,sha256:createHash('sha256').update(svg+'\n').digest('hex'),mimeType:'image/svg+xml',width:640,height:360}],transitions:[],renderRecipe:{templateId:'learning-coming-soon',templateVersion:'1.0.0',rendererProfile:'original-svg',brandTokenSource:MEDIA_PROJECT_BRAND_TOKEN_SOURCE,brandTextMode:'deterministic',networkPolicy:'offline',publishReady:false},source:{type:'content-package',reference:'src/features/learning/LearningComingSoonGraphic.tsx'},disclosure:{defaultDisclaimer:'Coming soon · noch kein Lernvideo veröffentlicht',requireAtProjectEdges:true},metadata:{draftOnly:true,videoRendered:false,rights:'SELF_AUTHORED_ORIGINAL',sourceSha}};
 const result=validateMediaProjectV2(project);if(!result.ok)throw new Error(JSON.stringify(result.errors));
 writeFileSync(new URL(`${slug}.media-project.json`,out),JSON.stringify(project,null,2)+'\n');
});
console.log('Generated three original video previews and validated MediaProject drafts.');
