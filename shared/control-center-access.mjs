import { verifiedOwner } from './account-display.mjs';

/** Client presentation guard only; server authorization remains mandatory. */
export function hasControlCenterAccess(session) {
  return verifiedOwner(session) && session.mfaRequired !== true;
}
