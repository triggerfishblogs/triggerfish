/**
 * Phase 8: Plugin SDK & Sandbox
 * Tests MUST FAIL until sandbox.ts and sdk.ts are implemented.
 * Tests isolation, capability enforcement, auto-tainting.
 */
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { createSandbox } from "../../src/plugin/sandbox.ts";
import { createPluginSdk } from "../../src/plugin/sdk.ts";

// --- Sandbox isolation ---

Deno.test("Sandbox: executes plugin code and returns result", async () => {
  const sandbox = await createSandbox({
    name: "test-plugin",
    version: "1.0",
    declaredEndpoints: [],
    maxClassification: "INTERNAL",
  });
  try {
    const result = await sandbox.execute('return 2 + 2');
    assertEquals(result, 4);
  } finally {
    await sandbox.destroy();
  }
});

Deno.test("Sandbox: blocks undeclared network access", async () => {
  const sandbox = await createSandbox({
    name: "test-plugin",
    version: "1.0",
    declaredEndpoints: ["https://api.allowed.com"],
    maxClassification: "PUBLIC",
  });
  try {
    // Attempting to access an undeclared endpoint should fail
    const result = await sandbox.execute(
      'try { await fetch("https://api.forbidden.com"); return "escaped" } catch { return "blocked" }'
    );
    assertEquals(result, "blocked");
  } finally {
    await sandbox.destroy();
  }
});

Deno.test("Sandbox: cannot access host filesystem", async () => {
  const sandbox = await createSandbox({
    name: "test-plugin",
    version: "1.0",
    declaredEndpoints: [],
    maxClassification: "PUBLIC",
  });
  try {
    const result = await sandbox.execute(
      'try { Deno.readTextFileSync("/etc/passwd"); return "escaped" } catch { return "blocked" }'
    );
    assertEquals(result, "blocked");
  } finally {
    await sandbox.destroy();
  }
});

// --- Plugin SDK ---

Deno.test("PluginSdk: emit_data requires classification label", async () => {
  const sdk = createPluginSdk({
    pluginName: "test",
    maxClassification: "INTERNAL",
  });
  // Emitting without classification should be rejected
  const result = sdk.emitData({ content: "some data" });
  assertEquals(result.ok, false);
});

Deno.test("PluginSdk: emit_data with classification succeeds", async () => {
  const sdk = createPluginSdk({
    pluginName: "test",
    maxClassification: "INTERNAL",
  });
  const result = sdk.emitData({
    content: "some data",
    classification: "PUBLIC",
  });
  assertEquals(result.ok, true);
});

Deno.test("PluginSdk: emit_data rejects classification above ceiling", async () => {
  const sdk = createPluginSdk({
    pluginName: "test",
    maxClassification: "INTERNAL",
  });
  // Plugin declared max INTERNAL, can't emit RESTRICTED
  const result = sdk.emitData({
    content: "data",
    classification: "RESTRICTED",
  });
  assertEquals(result.ok, false);
});

Deno.test("PluginSdk: auto-taints data read through SDK", async () => {
  const sdk = createPluginSdk({
    pluginName: "test",
    maxClassification: "CONFIDENTIAL",
  });
  const data = await sdk.queryAsUser("SELECT * FROM contacts");
  assertExists(data.classification);
});
