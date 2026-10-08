import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { allowedLocalModel, chunkDocument, learnStatus, retrieveLearned } from "./chat-buddy-learn.mjs";

test("local docs answer when the finance graph has no node", () => {
  const chunks = chunkDocument(
    "Chat Buddy/PROPRIETARY.md",
    "# Proprietary imprint\n\nJaJa Universe Buddy ist eine eigene Prägung von Capital-AI und nicht an Dritte lizenzierbar.",
  );
  const hits = retrieveLearned("Wem gehört die Prägung und ist sie lizenzierbar?", chunks, 2);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].path, "Chat Buddy/PROPRIETARY.md");
});

test("learned text drops secret-shaped values", () => {
  const chunks = chunkDocument("Chat Buddy/README.md", "Lizenz bleibt Capital-AI. Schlüssel sk-supersecretvalue12345 nicht zeigen.");
  assert.equal(JSON.stringify(chunks).includes("sk-supersecretvalue12345"), false);
});

test("only commercially open local models count as connected", () => {
  assert.equal(allowedLocalModel("smollm3:latest"), true);
  assert.equal(allowedLocalModel("phi4:mini"), true);
  assert.equal(allowedLocalModel("qwen3.8-max"), false);
  assert.equal(allowedLocalModel("llama3.1"), false);
});

test("status reads the Chat Buddy folder and never echoes env secrets", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "jaja-learn-"));
  await mkdir(path.join(root, "Chat Buddy"), { recursive: true });
  await writeFile(path.join(root, "Chat Buddy", "README.md"), "# Chat Buddy\n\nJaJa erklärt den EZB-Leitzins ohne Anlageberatung.\n");
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "secret-gemini-should-not-leak";
  try {
    const status = await learnStatus(root, "Was erklärt JaJa zum Leitzins?");
    const encoded = JSON.stringify(status);
    assert.equal(encoded.includes("secret-gemini-should-not-leak"), false);
    assert.equal(status.active, "local");
    assert.equal(status.files >= 1, true);
    assert.equal(status.hits[0].path, path.join("Chat Buddy", "README.md"));
    assert.equal(status.tools.find((tool) => tool.id === "corpus").connected, true);
    assert.equal(status.tools.find((tool) => tool.id === "ollama").connected, false);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
