import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import { thirdPartyNoticesPlugin } from './scripts/license-evidence.mjs';
import { handleAdvisorRequest } from './server/advisor.ts';
import { createLimiter } from './server/http-security.mjs';

// Check emitted static imports, not source imports: a cycle here can expose
// uninitialized cross-chunk bindings before the React bootstrap can catch them.
function chunkCycleGuard(): Plugin {
  return {
    name: 'chunk-cycle-guard',
    generateBundle(_options, bundle) {
      const visiting = new Set<string>();
      const visited = new Set<string>();
      const visit = (name: string, chain: string[]) => {
        if (visiting.has(name)) this.error(`Circular emitted chunk imports: ${[...chain, name].join(' -> ')}`);
        if (visited.has(name)) return;
        const chunk = bundle[name];
        if (!chunk || chunk.type !== 'chunk') return;
        visiting.add(name);
        for (const dependency of chunk.imports) visit(dependency, [...chain, name]);
        visiting.delete(name);
        visited.add(name);
      };
      for (const name of Object.keys(bundle)) visit(name, []);
    },
  };
}

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
    plugins: [react(), tailwindcss(), advisorApiPlugin(), thirdPartyNoticesPlugin(), chunkCycleGuard()],
    // Let Rolldown preserve module evaluation order. Size-based forced groups
    // split Motion's mutually dependent modules into circular vendor chunks.
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
