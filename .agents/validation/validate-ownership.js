import { inspect, logErrors } from './common.js';
const result = inspect();
logErrors('ownership', result.errors.ownership);
