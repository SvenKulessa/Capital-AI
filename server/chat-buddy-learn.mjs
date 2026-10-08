import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";

export const LEARN_SCHEMA = "CHAT_BUDDY_LEARN@1";

const LEARN_ROOTS = ["Chat Buddy", "docs", "README.md"];
const TEXT_EXT = new Set([".md", ".ts", ".tsx", ".mjs"]);
const SKIP_DIR = new Set(["node_modules", "dist", ".git", "evidence", "migrations"]);
const SECRET = /(?:sk-|AIza|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{8,}/g;
const ALLOWED_MODEL = /^(smollm|phi|granite|gemma4|qwen3\.6-27|qwen3\.6-35|mistral-small)/i;

const TOOLS = [
  {
    id: "corpus",
    name: "Lokales Lernen",
    license: "Capital-AI, nicht übertragbar",
    commercial: true,
    note: "Liest Doku und Code dieser Anwendung. Kein externer Aufruf.",
  },
  {
    id: "ollama",
    name: "Ollama",
    license: "MIT",
    commercial: true,
    note: "Nur Loopback. Erlaubt: SmolLM, Phi, Granite, Gemma 4, Qwen3.6-27B/35B, Mistral Small.",
  },
  {
    id: "llamacpp",
    name: "llama.cpp",
    license: "MIT",
    commercial: true,
    note: "Nicht gestartet. Dieselbe Modellgrenze wie Ollama.",
  },
  {
    id: "transformers",
    name: "Transformers.js",
    license: "Apache-2.0",
    commercial: true,
    note: "Paket ist nicht geladen. Ein Apache-2.0- oder MIT-Modell wäre zulässig.",
  },
];

let cache = null;

export function chunkDocument(filePath, source) {
  const clean = String(source).replace(SECRET, " ••• ").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  return clean.split(/\n(?=#{1,3} |export function |export const |function )/).flatMap((part, index) => {
    const text = part.replace(/\s+/g, " ").trim().slice(0, 700);
    if (text.length < 40) return [];
    const title = part.split("\n")[0].replace(/^#+\s*/, "").trim().slice(0, 80) || filePath;
    return [{ id: `${filePath}#${index}`, path: filePath, title, text }];
  });
}

export function retrieveLearned(question, chunks, limit = 3) {
  const tokens = [...new Set(String(question).toLowerCase().split(/[^a-z0-9äöüßàáâãèéêìíòóùúñç_-]+/).filter((token) => token.length > 2))];
  if (tokens.length === 0) return [];
  return chunks
    .map((chunk) => {
      const hay = `${chunk.path} ${chunk.title} ${chunk.text}`.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (hay.includes(token) ? (token.length > 5 ? 2 : 1) : 0), 0);
      return { chunk, score };
    })
    .filter((item) => item.score >= 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ chunk, score }) => ({ path: chunk.path, title: chunk.title, snippet: chunk.text.slice(0, 240), score }));
}

export function allowedLocalModel(name) {
  return ALLOWED_MODEL.test(String(name).split(":")[0] ?? "");
}

export async function learnStatus(root = process.cwd(), question = "") {
  const chunks = await loadCorpus(root);
  const q = String(question || "").slice(0, 400);
  const ollama = await probeOllama();
  return {
    schema: LEARN_SCHEMA,
    active: "local",
    files: new Set(chunks.map((chunk) => chunk.path)).size,
    chunks: chunks.length,
    hits: q ? retrieveLearned(q, chunks, 3) : [],
    tools: TOOLS.map((tool) => ({
      ...tool,
      connected: tool.id === "corpus" ? chunks.length > 0 : tool.id === "ollama" ? ollama.connected : false,
    })),
  };
}

async function loadCorpus(root) {
  const key = path.resolve(root);
  if (cache && cache.root === key && Date.now() - cache.at < 5 * 60 * 1000) return cache.chunks;
  const chunks = [];
  for (const entry of LEARN_ROOTS) {
    const start = path.resolve(key, entry);
    if (start !== key && !start.startsWith(key + path.sep)) continue;
    await walk(start, key, chunks);
  }
  cache = { root: key, at: Date.now(), chunks };
  return chunks;
}

async function walk(target, root, chunks) {
  let info;
  try {
    info = await lstat(target);
  } catch {
    return;
  }
  if (info.isSymbolicLink()) return;
  if (info.isFile()) {
    await take(target, root, chunks);
    return;
  }
  if (!info.isDirectory() || chunks.length >= 400) return;
  const entries = await readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP_DIR.has(entry.name) || chunks.length >= 400) continue;
    const full = path.resolve(target, entry.name);
    if (!full.startsWith(root + path.sep)) continue;
    if (entry.isDirectory()) await walk(full, root, chunks);
    else if (entry.isFile()) await take(full, root, chunks);
  }
}

async function take(full, root, chunks) {
  const ext = path.extname(full);
  if (!TEXT_EXT.has(ext) || full.includes(`${path.sep}evidence${path.sep}`) || full.includes(".test.")) return;
  const raw = await readFile(full, "utf8");
  if (raw.length > 80_000) return;
  chunks.push(...chunkDocument(path.relative(root, full), raw));
}

async function probeOllama() {
  const host = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/$/, "");
  let url;
  try {
    url = new URL(host);
  } catch {
    return { connected: false };
  }
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) return { connected: false };
  try {
    const response = await fetch(`${url.origin}/api/tags`, { signal: AbortSignal.timeout(800) });
    if (!response.ok) return { connected: false };
    const payload = await response.json();
    const names = Array.isArray(payload?.models) ? payload.models.map((item) => item?.name || "") : [];
    return { connected: names.some((name) => allowedLocalModel(name)) };
  } catch {
    return { connected: false };
  }
}
