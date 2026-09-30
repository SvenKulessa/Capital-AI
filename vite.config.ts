import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import { thirdPartyNoticesPlugin } from './scripts/license-evidence.mjs';
import { handleAdvisorRequest } from './server/advisor.ts';
import { createLimiter } from './server/http-security.mjs';

function advisorApiPlugin(): Plugin {
  const allow = createLimiter(10);
  return {
    name: 'advisor-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/advisor', async (req, res) => {
        if (req.method === 'POST') {
          if (!allow()) { res.statusCode = 429; res.end('Rate limited'); return; }
          if (req.headers.origin !== 'http://127.0.0.1:3000' || req.headers['content-type']?.split(';')[0] !== 'application/json') { res.statusCode = 403; res.end('Forbidden'); return; }
          let bodyStr = '';
          let bodyBytes = 0;
          req.on('data', (chunk) => {
            bodyBytes += chunk.length;
            if (bodyBytes > 16384) { res.statusCode = 413; res.end('Payload too large'); req.destroy(); return; }
            bodyStr += chunk;
          });
          req.on('end', async () => {
            if (res.writableEnded) return;
            try {
              const payload = bodyStr ? JSON.parse(bodyStr) : { prompt: '' };
              const result = await handleAdvisorRequest(payload);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
          });
          return;
        }
        res.statusCode = 405;
        res.end('Method Not Allowed');
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), advisorApiPlugin(), thirdPartyNoticesPlugin()],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'vendor', test: /node_modules/, priority: 10, minSize: 50_000, maxSize: 250_000 },
              { name: 'application', test: /[\\/]src[\\/]/, priority: 0, minSize: 50_000, maxSize: 250_000 },
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '127.0.0.1',
      cors: false,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
