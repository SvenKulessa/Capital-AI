import type { LegalRoute } from '../../components/LegalAndFaqPages';

export const LEGAL_ROUTES: LegalRoute[] = ['/faq', '/datenschutz', '/agb', '/impressum'];

export {
  APP_NAVIGATION_EVENT,
  navigateAppLocation,
  resolveAppRoute,
} from '../../utils/appNavigation';
