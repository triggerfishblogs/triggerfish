/**
 * Tests for file secret provider and Docker auto-detection.
 *
 * @module
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createFileSecretStore } from "../../src/secrets/file_provider.ts";

// Helper to temporarily set/unset env vars
function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void,
): void {
  const originals: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    originals[key] = Deno.env.get(key);
    if (vars[key] === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, vars[key]!);
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(originals)) {
      if (originals[key] === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, originals[key]!);
      }
    }
  }
}

// --- FileSecretStore (JSON) ---

Deno.test("FileSecretStore: reads JSON secrets file", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(
      tmpFile,
      JSON.stringify({ api_key: "secret-123", db_pass: "pw456" }),
    );
    const store = createFileSecretStore({ path: tmpFile });

    const result1 = await store.getSecret("api_key");
    assertEquals(result1.ok, true);
    if (result1.ok) assertEquals(result1.value, "secret-123");

    const result2 = await store.getSecret("missing");
    assertEquals(result2.ok, false);
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("FileSecretStore: reads .env format", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".env" });
  try {
    await Deno.writeTextFile(tmpFile, [
      "# Comment line",
      "",
      "API_KEY=secret-abc",
      'QUOTED_VALUE="hello world"',
      "SINGLE_QUOTED='test'",
      "PLAIN=value",
    ].join("\n"));

    const store = createFileSecretStore({ path: tmpFile });

    const r1 = await store.getSecret("API_KEY");
    assertEquals(r1.ok, true);
    if (r1.ok) assertEquals(r1.value, "secret-abc");

    const r2 = await store.getSecret("QUOTED_VALUE");
    assertEquals(r2.ok, true);
    if (r2.ok) assertEquals(r2.value, "hello world");

    const r3 = await store.getSecret("SINGLE_QUOTED");
    assertEquals(r3.ok, true);
    if (r3.ok) assertEquals(r3.value, "test");
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("FileSecretStore: setSecret writes to JSON file", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(tmpFile, "{}");
    const store = createFileSecretStore({ path: tmpFile });

    const setResult = await store.setSecret("new_key", "new_value");
    assertEquals(setResult.ok, true);

    // Read back from a fresh store to verify persistence
    const store2 = createFileSecretStore({ path: tmpFile });
    const getResult = await store2.getSecret("new_key");
    assertEquals(getResult.ok, true);
    if (getResult.ok) assertEquals(getResult.value, "new_value");
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("FileSecretStore: deleteSecret removes key", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(tmpFile, JSON.stringify({ keep: "a", remove: "b" }));
    const store = createFileSecretStore({ path: tmpFile });

    const delResult = await store.deleteSecret("remove");
    assertEquals(delResult.ok, true);

    const getResult = await store.getSecret("remove");
    assertEquals(getResult.ok, false);

    const keepResult = await store.getSecret("keep");
    assertEquals(keepResult.ok, true);
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("FileSecretStore: listSecrets returns all keys", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(tmpFile, JSON.stringify({ a: "1", b: "2", c: "3" }));
    const store = createFileSecretStore({ path: tmpFile });

    const result = await store.listSecrets();
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.sort(), ["a", "b", "c"]);
    }
  } finally {
    await Deno.remove(tmpFile);
  }
});

Deno.test("FileSecretStore: handles missing file gracefully", async () => {
  const store = createFileSecretStore({ path: "/tmp/nonexistent-secret-file.json" });
  const result = await store.getSecret("anything");
  assertEquals(result.ok, false);
});

// --- Auto-detection: Docker → file store ---

Deno.test("createKeychain returns file store in Docker environment", async () => {
  const { createKeychain } = await import("../../src/secrets/keychain.ts");

  withEnv({ TRIGGERFISH_DOCKER: "true" }, async () => {
    const store = createKeychain();
    // The file store should reference /data/secrets.json
    const result = await store.getSecret("nonexistent_key");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertStringIncludes(result.error, "/data/secrets.json");
    }
  });
});
