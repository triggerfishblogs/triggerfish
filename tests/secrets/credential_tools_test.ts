/**
 * Tests for the credential (username+password) secret management tool.
 *
 * @module
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createMemorySecretStore } from "../../src/core/secrets/keychain/keychain.ts";
import {
  createSecretToolExecutor,
  type CredentialPromptCallback,
} from "../../src/tools/secrets.ts";

/** Create a test prompt callback that always returns the given value. */
function makePrompt(value: string | null) {
  return (_name: string, _hint?: string): Promise<string | null> =>
    Promise.resolve(value);
}

/** Create a test credential prompt callback that returns the given credentials. */
function makeCredentialPrompt(
  result: { readonly username: string; readonly password: string } | null,
): CredentialPromptCallback {
  return (
    _name: string,
    _hint?: string,
  ): Promise<{ readonly username: string; readonly password: string } | null> =>
    Promise.resolve(result);
}

Deno.test("secret_save_credential — stores both username and password as separate secrets", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    makePrompt("unused"),
    makeCredentialPrompt({ username: "greg@example.com", password: "hunter2" }),
  );

  const result = await executor("secret_save_credential", {
    name: "email_smtp",
  });
  assertEquals(typeof result, "string");
  assertStringIncludes(result!, "email_smtp");
  assertStringIncludes(result!, "saved successfully");
  assertStringIncludes(result!, "{{secret:email_smtp:username}}");
  assertStringIncludes(result!, "{{secret:email_smtp:password}}");

  // Verify both secrets are stored
  const username = await store.getSecret("email_smtp:username");
  assertEquals(username.ok, true);
  if (username.ok) assertEquals(username.value, "greg@example.com");

  const password = await store.getSecret("email_smtp:password");
  assertEquals(password.ok, true);
  if (password.ok) assertEquals(password.value, "hunter2");
});

Deno.test("secret_save_credential — cancelled prompt returns cancelled message", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    makePrompt("unused"),
    makeCredentialPrompt(null),
  );

  const result = await executor("secret_save_credential", { name: "my_cred" });
  assertStringIncludes(result!, "cancelled");

  // Nothing should be stored
  const username = await store.getSecret("my_cred:username");
  assertEquals(username.ok, false);
});

Deno.test("secret_save_credential — empty username returns error", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    makePrompt("unused"),
    makeCredentialPrompt({ username: "", password: "pass123" }),
  );

  const result = await executor("secret_save_credential", {
    name: "test_cred",
  });
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "Username cannot be empty");
});

Deno.test("secret_save_credential — empty password returns error", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    makePrompt("unused"),
    makeCredentialPrompt({ username: "user@test.com", password: "" }),
  );

  const result = await executor("secret_save_credential", {
    name: "test_cred",
  });
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "Password cannot be empty");
});

Deno.test("secret_save_credential — empty name returns error", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    makePrompt("unused"),
    makeCredentialPrompt({ username: "user", password: "pass" }),
  );

  const result = await executor("secret_save_credential", { name: "" });
  assertStringIncludes(result!, "Error");
});

Deno.test("secret_save_credential — stored credentials resolvable via standard reference", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    makePrompt("unused"),
    makeCredentialPrompt({ username: "admin", password: "secret123" }),
  );

  await executor("secret_save_credential", { name: "jira_login" });

  // Both are individually queryable via standard getSecret
  const u = await store.getSecret("jira_login:username");
  assertEquals(u.ok, true);
  if (u.ok) assertEquals(u.value, "admin");

  const p = await store.getSecret("jira_login:password");
  assertEquals(p.ok, true);
  if (p.ok) assertEquals(p.value, "secret123");

  // They appear in secret_list
  const listResult = await executor("secret_list", {});
  assertStringIncludes(listResult!, "jira_login:username");
  assertStringIncludes(listResult!, "jira_login:password");
});

Deno.test("secret_save_credential — no credential prompt returns error", async () => {
  const store = createMemorySecretStore();
  // Pass undefined for credential prompt
  const executor = createSecretToolExecutor(store, makePrompt("unused"));

  const result = await executor("secret_save_credential", { name: "test" });
  assertStringIncludes(result!, "Error");
  assertStringIncludes(result!, "not available");
});

Deno.test("secret_save_credential — name is trimmed", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    makePrompt("unused"),
    makeCredentialPrompt({ username: "user", password: "pass" }),
  );

  await executor("secret_save_credential", { name: "  spaced_name  " });

  const u = await store.getSecret("spaced_name:username");
  assertEquals(u.ok, true);
  if (u.ok) assertEquals(u.value, "user");
});

Deno.test("secret_save_credential — hint is passed to prompt callback", async () => {
  const store = createMemorySecretStore();
  let capturedHint: string | undefined;
  const credPrompt: CredentialPromptCallback = (
    _name: string,
    hint?: string,
  ) => {
    capturedHint = hint;
    return Promise.resolve({ username: "u", password: "p" });
  };
  const executor = createSecretToolExecutor(
    store,
    makePrompt("unused"),
    credPrompt,
  );

  await executor("secret_save_credential", {
    name: "test",
    hint: "SMTP login for notifications",
  });

  assertEquals(capturedHint, "SMTP login for notifications");
});

Deno.test("secret_save_credential — existing secret_save still works alongside credential tool", async () => {
  const store = createMemorySecretStore();
  const executor = createSecretToolExecutor(
    store,
    makePrompt("api-key-value"),
    makeCredentialPrompt({ username: "user", password: "pass" }),
  );

  // Use the original secret_save
  const saveResult = await executor("secret_save", { name: "api_key" });
  assertStringIncludes(saveResult!, "saved successfully");

  const saved = await store.getSecret("api_key");
  assertEquals(saved.ok, true);
  if (saved.ok) assertEquals(saved.value, "api-key-value");

  // Use the new credential tool
  const credResult = await executor("secret_save_credential", {
    name: "login",
  });
  assertStringIncludes(credResult!, "saved successfully");

  const u = await store.getSecret("login:username");
  assertEquals(u.ok, true);
  if (u.ok) assertEquals(u.value, "user");
});
