import type { PropsWithChildren } from 'react';
import { PriceAlertsProvider } from '../context/PriceAlertsContext';

export function AppProviders({ children }: PropsWithChildren) {
  return <PriceAlertsProvider>{children}</PriceAlertsProvider>;
}
