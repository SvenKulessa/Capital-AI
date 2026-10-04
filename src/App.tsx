import { AppProviders } from './app/AppProviders';
import { AppShell } from './app/AppShell';

export { LEGAL_ROUTES, resolveAppRoute } from './app/routing/routes';

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}
