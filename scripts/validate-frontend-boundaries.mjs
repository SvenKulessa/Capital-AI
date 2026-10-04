import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const scopes = ['features', 'entities', 'shared'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

const rules = {
  features: ['app'],
  entities: ['app', 'features'],
  shared: ['app', 'features', 'entities'],
};

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function importSpecifiers(source) {
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
  ];
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]),
  );
}

function resolveTarget(file, specifier) {
  if (specifier.startsWith('.')) {
    return path.normalize(path.resolve(path.dirname(file), specifier));
  }
  if (specifier.startsWith('@/')) {
    return path.normalize(path.join(root, specifier.slice(2)));
  }
  return null;
}

const violations = [];

for (const scope of scopes) {
  const scopeRoot = path.join(srcRoot, scope);
  for (const file of walk(scopeRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const specifier of importSpecifiers(source)) {
      const target = resolveTarget(file, specifier);
      if (!target) continue;

      for (const forbidden of rules[scope]) {
        const forbiddenRoot = path.join(srcRoot, forbidden) + path.sep;
        if (target === path.join(srcRoot, forbidden) || target.startsWith(forbiddenRoot)) {
          violations.push(
            `${path.relative(root, file)} -> ${specifier} (forbidden ${scope} -> ${forbidden})`,
          );
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('FRONTEND_BOUNDARY_VIOLATION');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('FRONTEND_BOUNDARIES_PASS');
