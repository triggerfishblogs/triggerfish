/**
 * Tests for the secret management tools.
 *
 * Covers: single-value save, username+password credential pair save,
 * cancellation handling, empty-value rejection, list, delete, and
 * backward-compatible behavior when with_username is omitted.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createMemorySecretStore } from "../../src/core/secrets/keychain.ts";
import {
  createSecretToolExecutor,
  getSecretToolDefinitions,
  SECRET_TOOLS_SYSTEM_PROMPT,
} from "../../src/tools/secrets.ts";
import type { SecretPromptCallback } from "../../src/tools/secrets.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a prompt callback that always returns the given value. */
function fixedPrompt(value: string): SecretPromptCallback {
  return async (_name, _hint, _options) => {
    return { value };
  };
}

/** Build a prompt callback that also returns a username. */
function credentialPrompt(username: string, password: string): SecretPromptCallback {
  return async (_name, _hint, options) => {
    if (options?.withUsername) {
      return { value: password, username };
    }
    return { value: password };
  };
}

/** Build a prompt callback that always cancels. */
function cancelPrompt(): SecretPromptCallback {
  return async () => null;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

Deno.test("secret tool definitions include secret_save, secret_list, secret_delete", () => {
  const defs = getSecretToolDefinitions();
  const names = defs.map((d) => d.name);
  assertEquals(names.includes("secret_save"), true);
  assertEquals(names.includes("secret_list"), true);
  assertEquals(names.includes("secret_delete"), true);
});

Deno.test("secret_save tool definition includes with_username parameter", () => {
  const defs = getSecretToolDefinitions();
  const saveDef = defs.find((d) => d.name === "secret_save");
  assertEquals(saveDef !== undefined, true);
  assertEquals("with_username" in (saveDef!.parameters as Record<string, unknown>), true);
});

Deno.test("system prompt mentions with_username and credential pair syntax", () => {
  assertStringIncludes(SECRET_TOOLS_SYSTEM_PROMPT, "with_username");
  assertStringIncludes(SECRET_TOOLS_SYSTEM_PROMPT, "name:username");
  assertStringIncludes(SECRET_TOOLS_SYSTEM_PROMPT, "name:password");
});

// ─── secret_save without with_username (backward-compatible) ─────────────────

Deno.test("secret_save without with_username stores single key", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, fixedPrompt("s3cr3t"));

  const result = await executor("secret_save", { name: "api_key" });

  assertEquals(result !== null, true);
  assertStringIncludes(result!, "api_key");
  assertStringIncludes(result!, "{{secret:api_key}}");

  const stored = await store.getSecret("api_key");
  assertEquals(stored.ok, true);
  assertEquals((stored as { ok: true; value: string }).value, "s3cr3t");
});

Deno.test("secret_save without with_username does NOT store :password or :username keys", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, fixedPrompt("s3cr3t"));
  await executor("secret_save", { name: "mykey" });

  const pwResult = await store.getSecret("mykey:password");
  assertEquals(pwResult.ok, false);

  const unResult = await store.getSecret("mykey:username");
  assertEquals(unResult.ok, false);
});

Deno.test("secret_save with false with_username behaves as single-value save", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, fixedPrompt("token123"));
  await executor("secret_save", { name: "token", with_username: false });

  const stored = await store.getSecret("token");
  assertEquals(stored.ok, true);
  assertEquals((stored as { ok: true; value: string }).value, "token123");
});

// ─── secret_save with with_username ─────────────────────────────────────────

Deno.test("secret_save with with_username stores two keys: name:password and name:username", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    credentialPrompt("alice", "hunter2"),
  );

  const result = await executor("secret_save", { name: "smtp", with_username: true });

  assertEquals(result !== null, true);
  assertStringIncludes(result!, "smtp:password");
  assertStringIncludes(result!, "smtp:username");
  assertStringIncludes(result!, "{{secret:smtp:password}}");
  assertStringIncludes(result!, "{{secret:smtp:username}}");

  const pwStored = await store.getSecret("smtp:password");
  assertEquals(pwStored.ok, true);
  assertEquals((pwStored as { ok: true; value: string }).value, "hunter2");

  const unStored = await store.getSecret("smtp:username");
  assertEquals(unStored.ok, true);
  assertEquals((unStored as { ok: true; value: string }).value, "alice");
});

Deno.test("secret_save with with_username passes withUsername option to prompt callback", async () => {
  const store = createMemorySecretStore();
  let receivedOptions: { readonly withUsername: boolean } | undefined;
  const capturePrompt: SecretPromptCallback = async (_name, _hint, options) => {
    receivedOptions = options;
    return { value: "pass", username: "user" };
  };

  await createSecretToolExecutor(store, capturePrompt)(
    "secret_save",
    { name: "db", with_username: true },
  );

  assertEquals(receivedOptions?.withUsername, true);
});

Deno.test("secret_save with with_username does NOT store the bare name key", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    credentialPrompt("bob", "pass123"),
  );
  await executor("secret_save", { name: "email", with_username: true });

  const bareResult = await store.getSecret("email");
  assertEquals(bareResult.ok, false);
});

// ─── Cancellation ───────────────────────────────────────────────────────────

Deno.test("secret_save cancellation stores nothing and returns cancel message", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, cancelPrompt());

  const result = await executor("secret_save", { name: "mykey" });

  assertStringIncludes(result!, "cancelled");

  const listResult = await store.listSecrets();
  assertEquals((listResult as { ok: true; value: string[] }).value.length, 0);
});

Deno.test("secret_save with_username cancellation stores nothing", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, cancelPrompt());

  const result = await executor("secret_save", { name: "smtp", with_username: true });

  assertStringIncludes(result!, "cancelled");

  const listResult = await store.listSecrets();
  assertEquals((listResult as { ok: true; value: string[] }).value.length, 0);
});

// ─── Validation ─────────────────────────────────────────────────────────────

Deno.test("secret_save with empty name returns error", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, fixedPrompt("val"));

  const result = await executor("secret_save", { name: "" });
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "name");
});

Deno.test("secret_save with missing name returns error", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, fixedPrompt("val"));

  const result = await executor("secret_save", {});
  assertStringIncludes(result!, "Error");
});

Deno.test("secret_save with empty value returns error", async () => {
  const store = createMemorySecretStore();
  const emptyPrompt: SecretPromptCallback = async () => ({ value: "" });
  const executor = createSecretToolExecutor(store, emptyPrompt);

  const result = await executor("secret_save", { name: "key" });
  assertStringIncludes(result!, "cannot be empty");
});

// ─── secret_list ─────────────────────────────────────────────────────────────

Deno.test("secret_list returns stored secret names", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, fixedPrompt("v"));

  await executor("secret_save", { name: "key1" });
  await executor("secret_save", { name: "key2" });

  const result = await executor("secret_list", {});
  assertStringIncludes(result!, "key1");
  assertStringIncludes(result!, "key2");
});

Deno.test("secret_list with credential pair shows both sub-keys", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    credentialPrompt("user", "pass"),
  );

  await executor("secret_save", { name: "svc", with_username: true });

  const result = await executor("secret_list", {});
  assertStringIncludes(result!, "svc:password");
  assertStringIncludes(result!, "svc:username");
});

// ─── secret_delete ───────────────────────────────────────────────────────────

Deno.test("secret_delete removes the stored secret", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, fixedPrompt("val"));

  await executor("secret_save", { name: "token" });
  const del = await executor("secret_delete", { name: "token" });
  assertStringIncludes(del!, "deleted");

  const stored = await store.getSecret("token");
  assertEquals(stored.ok, false);
});

// ─── Non-secret tools return null ────────────────────────────────────────────

Deno.test("executor returns null for unknown tool names", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(store, fixedPrompt("v"));
  const result = await executor("some_other_tool", {});
  assertEquals(result, null);
});
