import { inspect, logErrors } from './common.js';
const result = inspect();
logErrors('agents', result.errors.agents);
