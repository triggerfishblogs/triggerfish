/**
 * Persona context loader tests.
 *
 * @module
 */

import { assertEquals, assert } from "@std/assert";
import { createMemoryStorage } from "../../../src/core/storage/memory.ts";
import { createMemoryStore } from "../../../src/tools/memory/store.ts";
import { loadPersonaContext, MAX_PERSONA_CHARS } from "../../../src/tools/memory/mod.ts";
import type { SessionId } from "../../../src/core/types/session.ts";

const SESSION_ID = "test-session-1" as SessionId;
const AGENT_ID = "agent-1";

function makeStore() {
  const storage = createMemoryStorage();
  const store = createMemoryStore({ storage });
  return { storage, store };
}

Deno.test("loadPersonaContext — returns empty string when no memories exist", async () => {
  const { storage, store } = makeStore();

  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assertEquals(result, "");
  await storage.close();
});

Deno.test("loadPersonaContext — includes persona-tagged memories", async () => {
  const { storage, store } = makeStore();

  await store.save({
    key: "user-name",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "User's name is Alice",
    tags: ["persona"],
    sourceSessionId: SESSION_ID,
  });

  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assert(result.includes("What I Know About You"));
  assert(result.includes("About You"));
  assert(result.includes("Alice"));
  await storage.close();
});

Deno.test("loadPersonaContext — includes rule-tagged memories", async () => {
  const { storage, store } = makeStore();

  await store.save({
    key: "rule-no-emojis",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Never use emojis in responses",
    tags: ["rule"],
    sourceSessionId: SESSION_ID,
  });

  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assert(result.includes("Your Rules"));
  assert(result.includes("Never use emojis"));
  await storage.close();
});

Deno.test("loadPersonaContext — includes preference-tagged memories", async () => {
  const { storage, store } = makeStore();

  await store.save({
    key: "pref-code-style",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Prefers functional style over OOP",
    tags: ["preference"],
    sourceSessionId: SESSION_ID,
  });

  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assert(result.includes("Your Preferences"));
  assert(result.includes("functional style"));
  await storage.close();
});

Deno.test("loadPersonaContext — includes project-tagged memories", async () => {
  const { storage, store } = makeStore();

  await store.save({
    key: "project-acme",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Acme project uses Deno + TypeScript",
    tags: ["project"],
    sourceSessionId: SESSION_ID,
  });

  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assert(result.includes("Project Context"));
  assert(result.includes("Deno + TypeScript"));
  await storage.close();
});

Deno.test("loadPersonaContext — rules appear before preferences (priority order)", async () => {
  const { storage, store } = makeStore();

  await store.save({
    key: "pref-tabs",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Prefers tabs over spaces",
    tags: ["preference"],
    sourceSessionId: SESSION_ID,
  });
  await store.save({
    key: "rule-no-any",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Never use any types",
    tags: ["rule"],
    sourceSessionId: SESSION_ID,
  });

  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  const rulesIndex = result.indexOf("Your Rules");
  const prefsIndex = result.indexOf("Your Preferences");
  assert(rulesIndex >= 0, "Rules section should be present");
  assert(prefsIndex >= 0, "Preferences section should be present");
  assert(rulesIndex < prefsIndex, "Rules should appear before preferences");
  await storage.close();
});

Deno.test("loadPersonaContext — enforces character budget", async () => {
  const { storage, store } = makeStore();

  // Save many large records that would exceed a small budget
  for (let i = 0; i < 20; i++) {
    await store.save({
      key: `rule-${i}`,
      agentId: AGENT_ID,
      sessionTaint: "PUBLIC",
      content: `This is rule number ${i} with a lot of padding text to fill up the budget: ${"x".repeat(100)}`,
      tags: ["rule"],
      sourceSessionId: SESSION_ID,
    });
  }

  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    maxChars: 500,
  });

  assert(result.length <= 500, `Result should be under 500 chars, got ${result.length}`);
  assert(result.length > 0, "Result should not be empty");
  await storage.close();
});

Deno.test("loadPersonaContext — respects default MAX_PERSONA_CHARS", async () => {
  const { storage, store } = makeStore();

  // Save enough records to potentially exceed the default limit
  for (let i = 0; i < 50; i++) {
    await store.save({
      key: `persona-fact-${i}`,
      agentId: AGENT_ID,
      sessionTaint: "PUBLIC",
      content: `Fact ${i}: ${"The user likes ".repeat(20)}`,
      tags: ["persona"],
      sourceSessionId: SESSION_ID,
    });
  }

  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assert(result.length <= MAX_PERSONA_CHARS, `Result should be under ${MAX_PERSONA_CHARS} chars, got ${result.length}`);
  await storage.close();
});

Deno.test("loadPersonaContext — respects classification gating", async () => {
  const { storage, store } = makeStore();

  await store.save({
    key: "user-name",
    agentId: AGENT_ID,
    sessionTaint: "CONFIDENTIAL",
    content: "User's name is Alice",
    tags: ["persona"],
    sourceSessionId: SESSION_ID,
  });

  // PUBLIC session should not see CONFIDENTIAL memories
  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  assertEquals(result, "");
  await storage.close();
});

Deno.test("loadPersonaContext — multiple tags on same record appear in first matching section", async () => {
  const { storage, store } = makeStore();

  await store.save({
    key: "pref-and-rule",
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
    content: "Always use strict TypeScript",
    tags: ["rule", "preference"],
    sourceSessionId: SESSION_ID,
  });

  const result = await loadPersonaContext({
    store,
    agentId: AGENT_ID,
    sessionTaint: "PUBLIC",
  });

  // Should appear in rules (higher priority) since we query per-tag
  assert(result.includes("Your Rules"));
  assert(result.includes("strict TypeScript"));
  await storage.close();
});
