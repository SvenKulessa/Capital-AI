import assert from "node:assert/strict";
import test from "node:test";
import { inspectChatBuddyKeys } from "./chat-buddy-keys.mjs";

test("chat buddy never returns or selects a billable key", () => {
  const secret = "secret-gemini-key-should-not-leak";
  const report = inspectChatBuddyKeys({
    GEMINI_API_KEY: secret,
    DEEPSEEK_API_KEY: "deepseek-secret",
    MISTRAL_API_KEY: "",
  });
  const encoded = JSON.stringify(report);
  assert.equal(encoded.includes(secret), false);
  assert.equal(encoded.includes("deepseek-secret"), false);
  assert.equal(report.active, "local");
  assert.equal(report.keys.find((item) => item.id === "gemini").state, "blocked");
  assert.equal(report.keys.find((item) => item.id === "gemini").used, false);
  assert.equal(report.keys.find((item) => item.id === "deepseek").state, "blocked");
  assert.equal(report.keys.find((item) => item.id === "mistral").present, false);
  assert.equal(report.keys.find((item) => item.id === "mistral").state, "missing");
});

test("missing render keys stay missing and unused", () => {
  const report = inspectChatBuddyKeys({});
  assert.equal(report.active, "local");
  assert.equal(report.keys.every((item) => item.present === false && item.used === false), true);
  assert.equal(report.keys.filter((item) => item.needed && item.state === "missing").map((item) => item.env).join(","), "GEMINI_API_KEY");
});
