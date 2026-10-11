import { inspect, logErrors } from './common.js';
const result = inspect();
logErrors('registry', result.errors.registry);
