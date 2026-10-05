import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './shared/ui/AppErrorBoundary';
import './index.css';

declare global {
  interface Window {
    __CAPITAL_AI_BOOTSTRAP_MOUNTED__?: boolean;
  }
}

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

window.__CAPITAL_AI_BOOTSTRAP_MOUNTED__ = true;
window.dispatchEvent(new Event('capital-ai:bootstrap-mounted'));
