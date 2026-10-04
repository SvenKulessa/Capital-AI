import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Deterministic browser-boundary regression gate; complements the current Trivy secret scan.
export async function verifyBrowserBoundary(root = path.resolve('dist')) {
  const forbidden = [/GEMINI_API_KEY/, /OIDC_CLIENT_SECRET/, /SUPABASE_SECRET_KEY/, /SUPABASE_SERVICE_ROLE_KEY/, /sb_secret_/, /TELEGRAM_BOT_TOKEN/, /api\.telegram\.org/, /@google\/genai/, /handleAdvisorRequest/];
  let checked = 0;
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (/\.(js|html|map)$/.test(entry.name)) {
        const source = await readFile(target, 'utf8'); checked++;
        if (forbidden.some(pattern => pattern.test(source))) throw new Error('Server-only symbol found in browser artifact: ' + path.relative(root, target));
        if (entry.name.endsWith('.js')) {
          // Parse executable code: documentation strings may legitimately show process.env examples.
          const ast = ts.createSourceFile(target, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
          function inspect(node) {
            if ((ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'process' && node.name.text === 'env') ||
                (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'process' && ts.isStringLiteral(node.argumentExpression) && node.argumentExpression.text === 'env')) throw new Error('Executable process.env found in browser artifact');
            ts.forEachChild(node, inspect);
          }
          inspect(ast);
        }
      }
    }
  }
  await visit(root);
  if (!checked) throw new Error('No browser artifacts found');
  return { checked, status: 'PASS', scope: 'SERVER_BROWSER_BOUNDARY_NOT_FULL_SECRET_SCAN' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await verifyBrowserBoundary()));
}
