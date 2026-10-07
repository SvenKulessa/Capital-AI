// Read-only owner catalog. GitHub is the source of truth for repository state, not runtime deployment state.
const REPO = 'SvenKulessa/Capital-AI';
const API = 'https://api.github.com/repos/' + REPO;
const RAW = 'https://raw.githubusercontent.com/' + REPO + '/';
const TTL_MS = 300_000;
const MAX_ROWS = 850;
const SAFE_PATH = /^[a-zA-Z0-9_@./+-]+$/;
const SHA = /^[a-f0-9]{40}$/;

async function readText(fetchImpl, url, maxBytes, optional = false) {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: url.startsWith(API) ? 'application/vnd.github+json' : 'text/plain' },
    redirect: 'error',
    signal: AbortSignal.timeout(6500),
  });
  if (optional && response.status === 404) return null;
  if (!response.ok) throw new Error('CATALOG_SOURCE_UNAVAILABLE');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('CATALOG_EMPTY_RESPONSE');
  const pieces = [];
  let bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error('CATALOG_RESPONSE_TOO_LARGE');
    }
    pieces.push(part.value);
  }
  return Buffer.concat(pieces).toString('utf8');
}

function parseJson(text, fallback = null) {
  if (text === null) return fallback;
  try { return JSON.parse(text); } catch { throw new Error('CATALOG_INVALID_JSON'); }
}

function domainForPath(path) {
  const s = path.toLowerCase();
  if (/^(docs\/growth|capital-ai-growth\/)|growth|social|seo|branding|campaign|contentengine/.test(s)) return 'GROWTH';
  if (/^(capital-ai-market\/|docs\/market-data\/)|market|provider|scor|portfolio|trading|kraken|uniswap|ecb|pricealert|whale|sector|asset/.test(s)) return 'MARKET';
  if (/^(capital-ai-trust\/|docs\/security\/)|auth|security|license|vault|privacy|compliance|oidc|cads|audit|policy|legal/.test(s)) return 'TRUST';
  if (/^(deploy\/|\.github\/|services\/)|infra|nats|redis|valkey|observab|docker|render|workflow|deploy|dependency|migrat|benchmark/.test(s)) return 'PLATFORM';
  return 'PRODUCT';
}

function applicationArea(path) {
  if (path.startsWith('src/features/') || path.startsWith('src/components/')) return 'Webanwendung / Benutzeroberfläche';
  if (path.startsWith('src/services/')) return 'Frontend-Domänendienst';
  if (path.startsWith('server/')) return 'Backend / API';
  if (path.startsWith('scripts/')) return 'Entwicklung / Automatisierung';
  if (path.startsWith('.github/workflows/')) return 'CI/CD / Sicherheit';
  if (path.startsWith('deploy/')) return 'Deployment / Infrastruktur';
  if (path.startsWith('apps/')) return 'Eigenständige Anwendung / GitHub App';
  if (path.startsWith('services/')) return 'Privater Runtime-Service';
  return 'Repository / Konfiguration';
}

function displayName(path) {
  const base = path.split('/').pop().replace(/\.(tsx?|mjs|ya?ml)$/, '');
  return base.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
}

function entry(id, name, kind, path, application, version, versionBasis, domain = domainForPath(path), digest = null) {
  return { id, name, kind, path, application, version, versionBasis, domain, digest };
}

function cargoDependencies(text) {
  const section = String(text || '').match(/^\[dependencies\]\s*\n([\s\S]*?)(?=^\[|\s*$)/m);
  if (!section) return [];
  return section[1].split('\n').map(line => {
    const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)$/);
    if (!match) return null;
    const source = match[2];
    const version = source.match(/version\s*=\s*"=?([^"]+)"/) || source.match(/^"=?([^"]+)"/);
    return { name: match[1], version: version?.[1] || null };
  }).filter(Boolean);
}

export function buildRepositoryToolCatalog({ sourceSha, tree, pkg, lock, cargo, dockerfiles = {}, integrations = [], supplementary = {} }) {
  if (!SHA.test(sourceSha) || !Array.isArray(tree) || tree.length > 8000) throw new Error('CATALOG_INVALID_TREE');
  const paths = new Set(tree.filter(item => item?.type === 'blob' && typeof item.path === 'string' && item.path.length < 260 && SAFE_PATH.test(item.path)).map(item => item.path));
  const rows = new Map();
  const add = row => { if (rows.size < MAX_ROWS) rows.set(row.id, row); };
  const projectVersion = typeof pkg?.version === 'string' ? pkg.version : null;
  add(entry('app:capital-ai', pkg?.name || 'Capital AI Web', 'ANWENDUNG', 'package.json', 'Webanwendung / API (Repository-Version)', projectVersion, 'package.json:version', 'PRODUCT'));

  for (const [kind, deps] of [['NPM_RUNTIME', pkg?.dependencies], ['NPM_DEVTOOL', pkg?.devDependencies]]) {
    for (const [name, range] of Object.entries(deps || {}).sort(([a], [b]) => a.localeCompare(b))) {
      const resolved = lock?.packages?.['node_modules/' + name]?.version;
      const safeVersion = typeof resolved === 'string' ? resolved : null;
      add(entry('npm:' + name, name, kind, 'package.json → package-lock.json#node_modules/' + name,
        kind === 'NPM_RUNTIME' ? 'JavaScript Runtime / Web-App' : 'Build / Entwicklung / Typprüfung',
        safeVersion || (typeof range === 'string' ? range : null),
        safeVersion ? 'package-lock.json (aufgelöst)' : 'package.json (Versionsbereich, nicht aufgelöst)',
        domainForPath(name)));
    }
  }


  for (const [prefix, type, area] of [
    ['deploy/runtime', 'NPM_PRODUCTION_BOUNDARY', 'Minimale Web-Runtime-Abhängigkeiten'],
    ['deploy/npm-security-patches', 'NPM_SECURITY_PATCH', 'Isolierte npm-Build-Security-Patches'],
  ]) {
    const manifest = supplementary[prefix + '/package.json'];
    const manifestLock = supplementary[prefix + '/package-lock.json'];
    if (!paths.has(prefix + '/package.json') || !manifest) continue;
    add(entry('app:' + prefix, manifest.name || prefix, 'ANWENDUNG', prefix + '/package.json',
      area, manifest.version || null, 'package.json:version', 'PLATFORM'));
    for (const [name, range] of Object.entries(manifest.dependencies || {})) {
      const pinned = manifestLock?.packages?.['node_modules/' + name]?.version || null;
      add(entry('npm:' + prefix + ':' + name, name, type, prefix + '/package.json → ' +
        prefix + '/package-lock.json#node_modules/' + name, area, pinned || range,
        pinned ? 'package-lock.json (aufgelöst)' : 'package.json (Versionsbereich, nicht aufgelöst)', 'PLATFORM'));
    }
  }

  const pythonPath = 'deploy/social-media/renderer-requirements.txt';
  if (paths.has(pythonPath)) {
    for (const line of String(supplementary[pythonPath] || '').split('\n')) {
      const match = line.match(/^([a-zA-Z0-9_-]+)==([^\s;#]+)/);
      if (match) add(entry('python:' + match[1], match[1], 'PYTHON_PAKET', pythonPath,
        'Social Media Renderer (Build-Requirement)', match[2], 'Requirements mit Hash-Pin; keine Worker-Deployment-Evidence', 'GROWTH'));
    }
  }
  const androidPath = 'mobile/android-private/app/build.gradle';
  if (paths.has(androidPath)) {
    const name = String(supplementary[androidPath] || '').match(/versionName\s+"([^"]+)"/)?.[1] || null;
    add(entry('app:android-private', 'Capital AI Android Private', 'ANWENDUNG', androidPath,
      'Private Android-App (separate Distribution)', name, 'Gradle versionName; nicht installiert bestätigt', 'PRODUCT'));
  }
  const gradlePath = 'mobile/android-private/build.gradle';
  if (paths.has(gradlePath)) {
    const gradleVersion = String(supplementary[gradlePath] || '').match(/com\.android\.application['"]\s+version\s+['"]([^'"]+)/)?.[1] || null;
    add(entry('tool:android-gradle-plugin', 'Android Gradle Plugin', 'BUILD_TOOL', gradlePath,
      'Android Build Toolchain', gradleVersion, 'Gradle Plugin-Pin', 'PLATFORM'));
  }
  const toolchainPath = 'services/provider-bridge-rs/rust-toolchain.toml';
  if (paths.has(toolchainPath)) {
    const rustVersion = String(supplementary[toolchainPath] || '').match(/channel\s*=\s*"([^"]+)"/)?.[1] || null;
    add(entry('tool:rust', 'Rust Toolchain', 'BUILD_TOOL', toolchainPath,
      'Rust Provider-Bridge Toolchain', rustVersion, 'rust-toolchain.toml (Pin, nicht Runtime)', 'PLATFORM'));
  }
  const ffmpegPath = 'deploy/social-media/ffmpeg-build-profile.json';
  if (paths.has(ffmpegPath) && supplementary[ffmpegPath]) {
    const profile = supplementary[ffmpegPath];
    add(entry('tool:ffmpeg', 'FFmpeg Social Renderer', 'BUILD_PROFILE', ffmpegPath,
      'Medien-Worker (Quelle deklariert; Runtime separat nachzuweisen)', profile.source?.version || null,
      profile.productionEligible === false ? 'Build-Profil, ausdrücklich NICHT productionEligible' : 'Build-Profil, keine Runtime-Evidence', 'GROWTH'));
  }
  const npmBuildVersion = String(dockerfiles.Dockerfile || '').match(/npm install --global npm@([0-9.]+)/)?.[1];
  if (npmBuildVersion) add(entry('tool:npm-cli', 'npm CLI', 'BUILD_TOOL', 'Dockerfile',
    'Nur Build-Toolchain; im Runtime-Image entfernt', npmBuildVersion, 'Dockerfile global npm Pin', 'PLATFORM'));

  if (paths.has('services/provider-bridge-rs/Cargo.toml')) {
    const crateVersion = String(cargo || '').match(/^version\s*=\s*"([^"]+)"/m)?.[1] || null;
    add(entry('app:provider-bridge', 'Capital AI Provider Bridge', 'ANWENDUNG', 'services/provider-bridge-rs/Cargo.toml',
      'Privater Rust-Provider-Executor (nicht automatisch deployed)', crateVersion, 'Cargo.toml:package.version', 'MARKET'));
    for (const dep of cargoDependencies(cargo)) {
      add(entry('cargo:' + dep.name, dep.name, 'RUST_CRATE', 'services/provider-bridge-rs/Cargo.toml',
        'Rust Bridge / Provider-Abfrage', dep.version, dep.version ? 'Cargo.toml (exakt deklariert)' : 'Cargo.toml (unaufgelöst)', 'MARKET'));
    }
  }

  for (const [path, source] of Object.entries(dockerfiles)) {
    if (!paths.has(path)) continue;
    for (const line of String(source || '').split('\n')) {
      const match = line.match(/^FROM\s+([^\s]+?)(?::([^@\s]+))?(?:@sha256:([a-f0-9]{64}))?(?:\s|$)/i);
      if (!match || match[1] === 'scratch' || !match[2]) continue;
      const name = match[1], tag = match[2], digest = match[3] || null;
      add(entry('image:' + path + ':' + name, name, 'OCI_IMAGE', path, 'Container-Build-Basis, keine Live-Runtime-Evidence',
        tag, digest ? 'Dockerfile (Image-Pin + Digest)' : 'Dockerfile (Tag ohne Digest)', 'PLATFORM', digest));
    }
  }

  for (const path of [...paths].sort()) {
    const isWeb = /^src\/features\/[^/]+\/[^/]+(?:Page|Dashboard|Panel)\.tsx$/.test(path) ||
      /^src\/components\/[^/]+(?:Page|Dashboard|Panel)\.tsx$/.test(path);
    const isDomainService = /^src\/services\/[^/]+\.ts$/.test(path);
    const isBackend = /^server\/[^/]+\.mjs$/.test(path) && !/\.test\.mjs$/.test(path);
    const isScript = /^scripts\/[^/]+\.mjs$/.test(path) && !/\.test\.mjs$/.test(path);
    const isWorkflow = /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path);
    const isDeploy = /^deploy\/(?:Dockerfile[^/]*|render[^/]*\.ya?ml|compose[^/]*\.ya?ml)$/.test(path);
    const isGitHubApp = /^apps\/[^/]+\/server\.mjs$/.test(path);
    if (!(isWeb || isDomainService || isBackend || isScript || isWorkflow || isDeploy || isGitHubApp)) continue;
    const kind = isWeb ? 'WEB_MODUL' : isDomainService ? 'FRONTEND_SERVICE' : isBackend ? 'API_MODUL' :
      isScript ? 'AUTOMATISIERUNG' : isWorkflow ? 'GITHUB_ACTION' : isDeploy ? 'DEPLOYMENT' : 'ANWENDUNG';
    add(entry('file:' + path, displayName(path), kind, path, applicationArea(path), projectVersion,
      'package.json (geerbte App-Version; keine Einzelversion)'));
  }

  for (const item of integrations) {
    if (!item || typeof item.name !== 'string' || typeof item.path !== 'string' || !paths.has(item.path) ||
        !SAFE_PATH.test(item.path) || !['PRODUCT','MARKET','PLATFORM','TRUST','GROWTH'].includes(item.domain)) continue;
    add(entry('integration:' + item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), item.name, 'EXTERNER_DIENST', item.path,
      String(item.application || 'Externer Dienst').slice(0, 160), null, 'Managed Service: keine Repo-Versionsaussage', item.domain));
  }

  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, 'de') || a.path.localeCompare(b.path));
}

export function createRepositoryToolCatalog({ fetchImpl = fetch, now = Date.now, env = process.env } = {}) {
  let cached = null;
  let cachedAt = 0;
  let running = null;
  async function load() {
    const branch = parseJson(await readText(fetchImpl, API + '/branches/main', 35_000));
    const sha = branch?.commit?.sha;
    if (!SHA.test(sha)) throw new Error('CATALOG_INVALID_HEAD');
    const treeResult = parseJson(await readText(fetchImpl, API + '/git/trees/' + sha + '?recursive=1', 1_600_000));
    if (treeResult?.truncated || !Array.isArray(treeResult?.tree)) throw new Error('CATALOG_TRUNCATED_TREE');
    const fromMain = (file, max, optional = false) => readText(fetchImpl, RAW + sha + '/' + file, max, optional);
    const files = ['package.json', 'package-lock.json', 'services/provider-bridge-rs/Cargo.toml',
      'Dockerfile', 'deploy/Dockerfile.nats', 'deploy/Dockerfile.provider-bridge', 'deploy/social-media/Dockerfile.renderer',
      'config/tool-catalog-integrations.json', 'deploy/runtime/package.json', 'deploy/runtime/package-lock.json',
      'deploy/npm-security-patches/package.json', 'deploy/npm-security-patches/package-lock.json',
      'deploy/social-media/renderer-requirements.txt', 'mobile/android-private/app/build.gradle',
      'mobile/android-private/build.gradle', 'services/provider-bridge-rs/rust-toolchain.toml',
      'deploy/social-media/ffmpeg-build-profile.json'];
    const sources = await Promise.all(files.map((file, index) =>
      fromMain(file, file.endsWith('package-lock.json') ? 2_400_000 : 85_000, index >= 2)));
    const supplementary = Object.fromEntries(files.slice(8).map((p, i) => {
      const value = sources[i + 8];
      return [p, p.endsWith('package.json') || p.endsWith('package-lock.json') || p.endsWith('ffmpeg-build-profile.json')
        ? parseJson(value) : value];
    }));
    const entries = buildRepositoryToolCatalog({
      sourceSha: sha, tree: treeResult.tree, pkg: parseJson(sources[0]), lock: parseJson(sources[1]),
      cargo: sources[2], dockerfiles: Object.fromEntries(files.slice(3, 7).map((p, i) => [p, sources[i + 3]])),
      integrations: parseJson(sources[7], []) || [], supplementary,
    });
    if (!entries.length) throw new Error('CATALOG_EMPTY');
    return {
      schema: 'CAPITAL_AI_REPOSITORY_TOOL_CATALOG@1',
      repository: REPO, branch: 'main', sourceSha: sha,
      deployedSha: SHA.test(env.RENDER_GIT_COMMIT || '') ? env.RENDER_GIT_COMMIT : null,
      observedAt: new Date(now()).toISOString(),
      freshness: 'LIVE', entries, total: entries.length,
    };
  }
  return {
    async snapshot() {
      if (cached && now() - cachedAt < TTL_MS) return { ...cached, freshness: 'CACHED' };
      if (!running) {
        running = load().then(value => {
          cached = value; cachedAt = now(); return value;
        }).finally(() => { running = null; });
      }
      try { return await running; }
      catch {
        if (cached) return { ...cached, freshness: 'STALE', error: 'REPOSITORY_UPSTREAM_UNAVAILABLE' };
        throw new Error('REPOSITORY_UPSTREAM_UNAVAILABLE');
      }
    },
  };
}
