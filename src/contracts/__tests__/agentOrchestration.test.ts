import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CAPITAL_AI_AGENT_STATE_VERSION,
  SHADOW_AGENT_AUTHORITY,
} from '../agentState';
import { CAPITAL_AI_AGENT_TRAJECTORY_VERSION } from '../agentTrajectory';

test('agent orchestration contracts are versioned and shadow authority is fail-closed', () => {
  assert.equal(CAPITAL_AI_AGENT_STATE_VERSION, 'CAPITAL_AI_AGENT_STATE@1');
  assert.equal(CAPITAL_AI_AGENT_TRAJECTORY_VERSION, 'CAPITAL_AI_AGENT_TRAJECTORY@1');
  assert.deepEqual(SHADOW_AGENT_AUTHORITY, {
    read: true,
    propose: true,
    write: false,
    trade: false,
    publish: false,
    legalDecision: false,
  });
});
