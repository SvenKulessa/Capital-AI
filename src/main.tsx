import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppErrorBoundary, BootstrapFailure } from './shared/ui/AppErrorBoundary';
import './index.css';

const host = document.getElementById('root');
if (!host) {
  throw new Error('APP_ROOT_MISSING');
}

const root = createRoot(host);

void import('./App.tsx')
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </StrictMode>,
    );
  })
  .catch(() => {
    root.render(
      <StrictMode>
        <BootstrapFailure />
      </StrictMode>,
    );
  });
