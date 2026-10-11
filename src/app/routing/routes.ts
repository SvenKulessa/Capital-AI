import type { LegalRoute } from '../../components/LegalAndFaqPages';

export const LEGAL_ROUTES: LegalRoute[] = ['/legal', '/faq', '/datenschutz', '/agb', '/impressum', '/kontakt'];

export {
  APP_NAVIGATION_EVENT,
  navigateAppLocation,
  resolveAppRoute,
} from '../../utils/appNavigation';
