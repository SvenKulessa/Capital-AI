import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, matchesGlob, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const testFile = /\.(?:test|spec)\.(?:[cm]?js|tsx?)$/;
const sourceFile = /\.(?:[cm]?js|tsx?)$/;
const excluded = new Set(['node_modules', '.git', 'dist', 'artifacts', 'security-reports', 'coverage']);

// This is an execution-reference guard, not proof that a conditional CI job ran.
// Python/Rust retain their existing language-specific workflows and prerequisites.
export function inspectTestWiring(files) {
  const paths = [...files.keys()];
  const tests = paths.filter(path => testFile.test(path));
  const scripts = JSON.parse(files.get('package.json') || '{}').scripts || {};
  const reached = new Set(), calledExports = new Set(), queue = [], commands = new Set();
  const unquote = token => token.replace(/^(['"])(.*)\1$/, '$2');
  const local = (from, specifier) => {
    if (!specifier.startsWith('.')) return null;
    const base = posix.normalize(posix.join(posix.dirname(from), specifier));
    return [base, ...['.ts','.tsx','.mjs','.js','/index.ts','/index.mjs'].map(ext => base + ext)].find(path => files.has(path));
  };
  function command(text) {
    if (commands.has(text)) return;
    commands.add(text);
    for (const part of text.replace(/\\\r?\n/g, ' ').split(/\n|&&|\|\||;/)) {
      let tokens = (part.trim().match(/"[^"\n]*"|'[^'\n]*'|[^\s]+/g) || []).map(unquote);
      while (tokens[0] && /^(?:[A-Za-z_]\w*=|exec$)/.test(tokens[0])) tokens.shift();
      if (tokens[0] === 'npm') {
        const name = tokens[1] === 'test' ? 'test' : tokens[1] === 'run' ? tokens[2] : null;
        if (scripts[name]) command(scripts[name]);
        continue;
      }
      const container = tokens[0] === 'docker' && tokens.includes('--entrypoint') && tokens[tokens.indexOf('--entrypoint') + 1] === 'node';
      if (container) tokens = ['node', ...tokens.slice(tokens.indexOf('--entrypoint') + 3)];
      if (tokens[0] !== 'node') continue;
      if (tokens.includes('--run')) {
        const name = tokens[tokens.indexOf('--run') + 1];
        if (scripts[name]) command(scripts[name]);
        continue;
      }
      if (tokens.includes('-e') || tokens.includes('--eval')) continue;
      const args = tokens.slice(1);
      for (let i = 0; i < args.length; i++) {
        if (['--import','--require','-r','--test-reporter','--test-name-pattern','--test-skip-pattern'].includes(args[i])) { i++; continue; }
        if (args[i].startsWith('-')) continue;
        const candidate = args[i].replace(container ? /^\/app\// : /^\.\//, '');
        if (files.has(candidate) && sourceFile.test(candidate)) queue.push(candidate);
        else if (candidate.includes('*')) queue.push(...tests.filter(path => matchesGlob(path, candidate)));
      }
    }
  }
  for (const [path, content] of files) {
    if (/^\.github\/workflows\/.*\.ya?ml$/.test(path)) {
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const m = /^(\s*)(?:-\s+)?run:\s*(.*)$/.exec(lines[i]);
        if (!m) continue;
        if (/^[|>]/.test(m[2])) {
          let body = '';
          while (i + 1 < lines.length && (!lines[i+1].trim() || /^\s*/.exec(lines[i+1])[0].length > m[1].length)) body += lines[++i] + '\n';
          command(body);
        } else command(unquote(m[2]));
      }
    }
    if (posix.basename(path).startsWith('Dockerfile')) {
      for (const line of content.replace(/\\\r?\n/g, ' ').split(/\r?\n/)) if (/^RUN\s/.test(line)) command(line.replace(/^RUN\s+(?:--[^\s]+\s+)*/, ''));
    }
  }
  while (queue.length) {
    const path = queue.shift();
    if (reached.has(path)) continue;
    reached.add(path);
    const source = ts.createSourceFile(path, files.get(path), ts.ScriptTarget.Latest, true);
    const calls = new Set();
    const visit = node => {
      // Merely declaring a callback/function that mentions a suite is not a call.
      if (ts.isFunctionLike(node)) {
        const parent=node.parent;
        if (!(ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && ['test','it','describe'].includes(parent.expression.text))) return;
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) calls.add(node.expression.text);
      ts.forEachChild(node, visit);
    };
    visit(source);
    for (const node of source.statements) {
      if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly || !ts.isStringLiteral(node.moduleSpecifier)) continue;
      const bindings=node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.length && bindings.elements.every(binding => binding.isTypeOnly) && !node.importClause.name) continue;
      const target = local(path, node.moduleSpecifier.text);
      if (!target) continue;
      queue.push(target);
      for (const binding of node.importClause?.namedBindings?.elements || []) {
        if (!binding.isTypeOnly && calls.has(binding.name.text)) calledExports.add(target + ':' + (binding.propertyName?.text || binding.name.text));
      }
    }
  }
  const unreferenced = tests.filter(path => !reached.has(path));
  const uncalledSuites = [];
  for (const path of tests.filter(path => reached.has(path))) {
    const source = ts.createSourceFile(path, files.get(path), ts.ScriptTarget.Latest, true);
    // Legacy tests expose run* suites instead of registering with node:test.
    for (const node of source.statements) {
      if (ts.isFunctionDeclaration(node) && node.name && /^run.*(?:Suite|Tests)$/.test(node.name.text) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (!calledExports.has(path + ':' + node.name.text)) uncalledSuites.push(path + ':' + node.name.text);
      }
    }
  }
  return { passed: !unreferenced.length && !uncalledSuites.length, testFiles: tests.length, unreferenced: unreferenced.sort(), uncalledSuites: uncalledSuites.sort(), scope: 'OWN_NODE_TEST_EXECUTION_REFERENCES_NOT_CI_COMPLETION' };
}

export function repositoryTestSources(root) {
  const files = new Map();
  function walk(directory) {
    for (const entry of readdirSync(join(root, directory), { withFileTypes:true })) {
      if (excluded.has(entry.name) || entry.isSymbolicLink()) continue;
      const path = posix.join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (sourceFile.test(path) || /^\.github\/workflows\/.*\.ya?ml$/.test(path) || entry.name.startsWith('Dockerfile')) files.set(path, readFileSync(join(root, path), 'utf8'));
    }
  }
  for (const directory of ['scripts','server','src','apps','packages','.agents','.github','deploy']) if (existsSync(join(root,directory))) walk(directory);
  files.set('package.json', readFileSync(join(root,'package.json'), 'utf8'));
  for (const name of readdirSync(root)) if (name.startsWith('Dockerfile')) files.set(name,readFileSync(join(root,name),'utf8'));
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectTestWiring(repositoryTestSources(process.cwd()));
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
