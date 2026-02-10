/**
 * Phase 9a: Plugin SDK queryAsUserSafe with capabilities validation.
 * Tests capability-based query validation, query handlers, and backward compatibility.
 */
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { createPluginSdk } from "../../src/plugin/sdk.ts";
import type { PluginCapability, QueryHandler } from "../../src/plugin/sdk.ts";

// --- queryAsUserSafe with capabilities ---

Deno.test("queryAsUserSafe: returns data when capability matches", async () => {
  const capabilities: readonly PluginCapability[] = [
    { type: "database", resource: "contacts", permissions: ["read"] },
  ];
  const sdk = createPluginSdk({
    pluginName: "test-query",
    maxClassification: "INTERNAL",
    capabilities,
  });
  const result = await sdk.queryAsUserSafe("SELECT * FROM contacts");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.classification, "INTERNAL");
    assertExists(result.value.data);
  }
});

Deno.test("queryAsUserSafe: returns error when no capability matches", async () => {
  const capabilities: readonly PluginCapability[] = [
    { type: "database", resource: "contacts", permissions: ["read"] },
  ];
  const sdk = createPluginSdk({
    pluginName: "test-query",
    maxClassification: "INTERNAL",
    capabilities,
  });
  const result = await sdk.queryAsUserSafe("SELECT * FROM secrets");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(
      result.error.includes("not covered by declared capabilities"),
      true,
    );
  }
});

Deno.test("queryAsUserSafe: uses queryHandler when provided", async () => {
  const handler: QueryHandler = async (query, _pluginName) => {
    return {
      data: { results: [`row for ${query}`] },
      classification: "PUBLIC" as const,
    };
  };
  const sdk = createPluginSdk({
    pluginName: "test-query",
    maxClassification: "INTERNAL",
    capabilities: [
      { type: "database", resource: "users", permissions: ["read"] },
    ],
    queryHandler: handler,
  });
  const result = await sdk.queryAsUserSafe("SELECT * FROM users");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.classification, "PUBLIC");
    const data = result.value.data as { results: string[] };
    assertEquals(data.results[0], "row for SELECT * FROM users");
  }
});

Deno.test("queryAsUserSafe: validates handler result does not exceed ceiling", async () => {
  const handler: QueryHandler = async (_query, _pluginName) => {
    return {
      data: { secret: "classified" },
      classification: "RESTRICTED" as const,
    };
  };
  const sdk = createPluginSdk({
    pluginName: "test-query",
    maxClassification: "INTERNAL",
    capabilities: [
      { type: "database", resource: "data", permissions: ["read"] },
    ],
    queryHandler: handler,
  });
  const result = await sdk.queryAsUserSafe("SELECT * FROM data");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("exceeds ceiling"), true);
  }
});

Deno.test("queryAsUserSafe: empty capabilities rejects all queries", async () => {
  const sdk = createPluginSdk({
    pluginName: "test-query",
    maxClassification: "INTERNAL",
    capabilities: [],
  });
  const result = await sdk.queryAsUserSafe("SELECT * FROM anything");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(
      result.error.includes("not covered by declared capabilities"),
      true,
    );
  }
});

Deno.test("queryAsUser: backward compat without capabilities configured", async () => {
  // When no capabilities are configured, queryAsUser should work as before
  const sdk = createPluginSdk({
    pluginName: "test-compat",
    maxClassification: "CONFIDENTIAL",
  });
  const data = await sdk.queryAsUser("SELECT * FROM contacts");
  assertExists(data.classification);
  assertEquals(data.classification, "CONFIDENTIAL");
  const payload = data.data as { query: string; rows: unknown[] };
  assertEquals(payload.query, "SELECT * FROM contacts");
  assertEquals(payload.rows.length, 0);
});

Deno.test("emitData: still works correctly (regression)", () => {
  const sdk = createPluginSdk({
    pluginName: "test-emit",
    maxClassification: "INTERNAL",
    capabilities: [
      { type: "database", resource: "contacts", permissions: ["read"] },
    ],
  });

  // Emitting with valid classification should succeed
  const okResult = sdk.emitData({
    content: "hello",
    classification: "PUBLIC",
  });
  assertEquals(okResult.ok, true);

  // Emitting without classification should fail
  const noLabel = sdk.emitData({ content: "hello" });
  assertEquals(noLabel.ok, false);

  // Emitting above ceiling should fail
  const aboveCeiling = sdk.emitData({
    content: "hello",
    classification: "RESTRICTED",
  });
  assertEquals(aboveCeiling.ok, false);
});

Deno.test("queryAsUserSafe: wildcard capability allows any query", async () => {
  const capabilities: readonly PluginCapability[] = [
    { type: "any", resource: "*", permissions: ["read", "write"] },
  ];
  const sdk = createPluginSdk({
    pluginName: "test-wildcard",
    maxClassification: "CONFIDENTIAL",
    capabilities,
  });

  const result1 = await sdk.queryAsUserSafe("SELECT * FROM contacts");
  assertEquals(result1.ok, true);

  const result2 = await sdk.queryAsUserSafe("arbitrary query about anything");
  assertEquals(result2.ok, true);

  const result3 = await sdk.queryAsUserSafe("DELETE FROM secrets");
  assertEquals(result3.ok, true);
});

Deno.test("queryAsUser: throws on capability violation with capabilities configured", async () => {
  const sdk = createPluginSdk({
    pluginName: "test-throw",
    maxClassification: "INTERNAL",
    capabilities: [
      { type: "database", resource: "contacts", permissions: ["read"] },
    ],
  });
  // queryAsUser should throw when capability doesn't match
  await assertRejects(
    () => sdk.queryAsUser("SELECT * FROM secrets"),
    Error,
    "not covered by declared capabilities",
  );
});

Deno.test("queryAsUserSafe: handler at exactly max classification succeeds", async () => {
  const handler: QueryHandler = async (_query, _pluginName) => {
    return {
      data: { internal: "data" },
      classification: "INTERNAL" as const,
    };
  };
  const sdk = createPluginSdk({
    pluginName: "test-exact",
    maxClassification: "INTERNAL",
    capabilities: [
      { type: "database", resource: "data", permissions: ["read"] },
    ],
    queryHandler: handler,
  });
  const result = await sdk.queryAsUserSafe("query data");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.classification, "INTERNAL");
  }
});
