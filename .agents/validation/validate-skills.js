import { inspect, logErrors } from './common.js';
const result = inspect();
logErrors('skills', result.errors.skills);
