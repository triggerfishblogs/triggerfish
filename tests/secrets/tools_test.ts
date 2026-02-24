/**
 * Tests for the secret management LLM tool executor.
 *
 * @module
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createMemorySecretStore } from "../../src/core/secrets/keychain/keychain.ts";
import { createSecretToolExecutor, getSecretToolDefinitions, SECRET_TOOLS_SYSTEM_PROMPT } from "../../src/tools/secrets.ts";

/** Create a test prompt callback that always returns the given value. */
function makePrompt(value: string | null) {
  return (_name: string, _hint?: string): Promise<string | null> =>
    Promise.resolve(value);
}

Deno.test("getSecretToolDefinitions — returns 4 tool definitions", () => {
  const defs = getSecretToolDefinitions();
  assertEquals(defs.length, 4);
  assertEquals(defs[0].name, "secret_save");
  assertEquals(defs[1].name, "secret_save_credential");
  assertEquals(defs[2].name, "secret_list");
  assertEquals(defs[3].name, "secret_delete");
});

Deno.test("SECRET_TOOLS_SYSTEM_PROMPT — contains reference syntax", () => {
  assertStringIncludes(SECRET_TOOLS_SYSTEM_PROMPT, "{{secret:name}}");
  assertStringIncludes(SECRET_TOOLS_SYSTEM_PROMPT, "secret_save");
  assertStringIncludes(SECRET_TOOLS_SYSTEM_PROMPT, "secret_list");
});

Deno.test("createSecretToolExecutor — secret_save stores value and returns confirmation", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, makePrompt("my-secret-value"));

  const result = await executor("secret_save", { name: "my_key" });
  assertEquals(typeof result, "string");
  assertStringIncludes(result!, "my_key");
  assertStringIncludes(result!, "saved successfully");
  assertStringIncludes(result!, "{{secret:my_key}}");

  // Value should be stored
  const stored = await store.getSecret("my_key");
  assertEquals(stored.ok, true);
  if (!stored.ok) return;
  assertEquals(stored.value, "my-secret-value");
});

Deno.test("createSecretToolExecutor — secret_save does NOT accept value from LLM args", async () => {
  const store = createMemorySecretStore();
  // Prompt returns "from-prompt", not anything from the LLM input
  const executor = createSecretToolExecutor(store, makePrompt("from-prompt"));

  // Even if LLM passes a value, it is ignored
  await executor("secret_save", { name: "test_key", value: "from-llm" });

  const stored = await store.getSecret("test_key");
  assertEquals(stored.ok, true);
  if (!stored.ok) return;
  assertEquals(stored.value, "from-prompt");
});

Deno.test("createSecretToolExecutor — secret_save with cancelled prompt", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, makePrompt(null));

  const result = await executor("secret_save", { name: "cancelled_key" });
  assertStringIncludes(result!, "cancelled");

  // Should not be stored
  const stored = await store.getSecret("cancelled_key");
  assertEquals(stored.ok, false);
});

Deno.test("createSecretToolExecutor — secret_save with empty name returns error", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, makePrompt("value"));

  const result = await executor("secret_save", { name: "" });
  assertStringIncludes(result!, "Error");
});

Deno.test("createSecretToolExecutor — secret_save with empty value returns error", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, makePrompt(""));

  const result = await executor("secret_save", { name: "test" });
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "empty");
});

Deno.test("createSecretToolExecutor — secret_list returns names only", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("key_one", "value1");
  await store.setSecret("key_two", "value2");
  const executor = createSecretToolExecutor(store, makePrompt("x"));

  const result = await executor("secret_list", {});
  assertStringIncludes(result!, "key_one");
  assertStringIncludes(result!, "key_two");
  // Should NOT contain the actual values
  assertEquals(result!.includes("value1"), false);
  assertEquals(result!.includes("value2"), false);
});

Deno.test("createSecretToolExecutor — secret_list when empty", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, makePrompt("x"));

  const result = await executor("secret_list", {});
  assertStringIncludes(result!, "No secrets");
});

Deno.test("createSecretToolExecutor — secret_delete removes a secret", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("to_delete", "secret");
  const executor = createSecretToolExecutor(store, makePrompt("x"));

  const result = await executor("secret_delete", { name: "to_delete" });
  assertStringIncludes(result!, "deleted");

  const stored = await store.getSecret("to_delete");
  assertEquals(stored.ok, false);
});

Deno.test("createSecretToolExecutor — secret_delete non-existent secret returns error", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, makePrompt("x"));

  const result = await executor("secret_delete", { name: "nonexistent" });
  assertStringIncludes(result!, "Error");
});

Deno.test("createSecretToolExecutor — returns null for unknown tools", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, makePrompt("x"));

  const result = await executor("some_other_tool", {});
  assertEquals(result, null);
});

Deno.test("createSecretToolExecutor — secret_save trims whitespace from name", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, makePrompt("trimmed-value"));

  await executor("secret_save", { name: "  trimmed_key  " });

  const stored = await store.getSecret("trimmed_key");
  assertEquals(stored.ok, true);
  if (!stored.ok) return;
  assertEquals(stored.value, "trimmed-value");
});
