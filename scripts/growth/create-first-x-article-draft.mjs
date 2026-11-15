#!/usr/bin/env node
/**
 * Create the first Capital-AI educational draft Article on X.
 * 
 * Status: DRAFT_ONLY – does not publish.
 * Requires X_ACCESS_TOKEN in the environment.
 * 
 * Content source: CAPITAL-AI Social Content Backlog v5.0 – LinkedIn 01 / Evidence-first Scoring
 * Educational only. No financial advice, no investment recommendations.
 */

import { XArticlesClient } from '../../src/services/x/xArticlesClient.ts';

const FIRST_ARTICLE = {
  title: 'Evidence-first Scoring: Was ein nachvollziehbarer Score belegen muss',
  content_state: {
    blocks: [
      {
        key: '1',
        text: 'Evidence-first Scoring: Was ein nachvollziehbarer Score belegen muss',
        type: 'header-one',
      },
      {
        key: '2',
        text: 'Bei Evidence-first Scoring führt eine überzeugende Produktgeschichte nur dann zu Vertrauen, wenn Architektur und tatsächliche Nachweise zusammenpassen.',
        type: 'unstyled',
      },
      {
        key: '3',
        text: 'Für CAPITAL-AI heißt das: zuerst die technische Grenze benennen, danach einen überprüfbaren Test festlegen und erst anschließend aus einem Pilot einen Release-Claim machen. Ein Repository-Artefakt belegt keine aktive, rechtlich freigegebene Produktfunktion.',
        type: 'unstyled',
      },
      {
        key: '4',
        text: 'Diskussionsfrage: Welchen konkreten Nachweis würdest du vor einer Produktfreigabe erwarten?',
        type: 'unstyled',
      },
      {
        key: '5',
        text: 'Redaktionsstatus: Entwurf, keine automatische Veröffentlichung. Bildungsinhalt – keine Anlageberatung.',
        type: 'unstyled',
      },
    ],
    entities: [],
  },
};

async function main() {
  if (!process.env.X_ACCESS_TOKEN) {
    console.error('ERROR: X_ACCESS_TOKEN is not set.');
    console.error('Set a valid OAuth 2.0 user access token (scopes: tweet.read, tweet.write, users.read) and re-run.');
    process.exit(1);
  }

  const client = new XArticlesClient();
  console.log('Creating draft Article on X (DRAFT_ONLY, no publish)...');

  try {
    const result = await client.createDraftArticle(FIRST_ARTICLE);
    console.log('SUCCESS: Draft Article created.');
    console.log('Draft ID:', result.data.id);
    console.log('Title:', result.data.title);
    console.log('Next: Review in X UI. Publishing remains blocked by policy until editorial + rights approval.');
  } catch (error) {
    console.error('Failed to create draft:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
