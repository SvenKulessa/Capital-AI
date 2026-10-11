// Offline output to stdout; reviewable actual text bytes and existing Social package.
import { buildLearningContentCampaign } from '../../src/contracts/learningContentCampaign.ts';
console.log(JSON.stringify(await buildLearningContentCampaign(), null, 2));
