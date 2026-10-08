import type { PropsWithChildren } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { PriceAlertsProvider } from '../context/PriceAlertsContext';

export function AppProviders({ children }: PropsWithChildren) {
  return <LocaleProvider><PriceAlertsProvider>{children}</PriceAlertsProvider></LocaleProvider>;
}
