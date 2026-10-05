import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppErrorBoundary } from './shared/ui/AppErrorBoundary';
import App from './App.tsx';
import './index.css';

const host = document.getElementById('root');
if (!host) {
  throw new Error('APP_ROOT_MISSING');
}

const root = createRoot(host);

root.render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
