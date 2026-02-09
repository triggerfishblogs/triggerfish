/**
 * Phase 12: First Integration (Filesystem MCP)
 * Tests MUST FAIL until filesystem server and e2e pipeline are implemented.
 * Tests full flow: CLI -> agent -> MCP Gateway -> filesystem -> response with classification & lineage.
 */
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { createFilesystemServer } from "../../src/integrations/filesystem/server.ts";
import { createMcpGateway } from "../../src/mcp/gateway/gateway.ts";
import { createOrchestrator } from "../../src/agent/orchestrator.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import { createHookRunner, createDefaultRules } from "../../src/core/policy/hooks.ts";
import { createSession, updateTaint } from "../../src/core/types/session.ts";
import { createLineageStore } from "../../src/core/session/lineage.ts";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";

// --- Filesystem MCP Server ---

Deno.test("FilesystemServer: read_file returns file contents", async () => {
  const tmpDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tmpDir}/test.txt`, "hello world");
  const server = createFilesystemServer({ rootPath: tmpDir, classification: "INTERNAL" });
  try {
    const result = await server.callTool("read_file", { path: "test.txt" });
    assertEquals(result.ok, true);
    if (result.ok) {
      assert(result.value.content.includes("hello world"));
      assertEquals(result.value.classification, "INTERNAL");
    }
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("FilesystemServer: write_file creates file", async () => {
  const tmpDir = await Deno.makeTempDir();
  const server = createFilesystemServer({ rootPath: tmpDir, classification: "INTERNAL" });
  try {
    const result = await server.callTool("write_file", { path: "new.txt", content: "created" });
    assertEquals(result.ok, true);
    const content = await Deno.readTextFile(`${tmpDir}/new.txt`);
    assertEquals(content, "created");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("FilesystemServer: list_directory returns entries", async () => {
  const tmpDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tmpDir}/a.txt`, "a");
  await Deno.writeTextFile(`${tmpDir}/b.txt`, "b");
  const server = createFilesystemServer({ rootPath: tmpDir, classification: "INTERNAL" });
  try {
    const result = await server.callTool("list_directory", { path: "." });
    assertEquals(result.ok, true);
    if (result.ok) {
      assert(result.value.entries.length >= 2);
    }
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("FilesystemServer: blocks path traversal", async () => {
  const tmpDir = await Deno.makeTempDir();
  const server = createFilesystemServer({ rootPath: tmpDir, classification: "INTERNAL" });
  try {
    const result = await server.callTool("read_file", { path: "../../etc/passwd" });
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

// --- E2E: Classification and lineage through the pipeline ---

Deno.test("E2E: file access propagates taint to session", async () => {
  const tmpDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tmpDir}/secret.txt`, "classified data");

  const engine = createPolicyEngine();
  for (const r of createDefaultRules()) engine.addRule(r);
  const runner = createHookRunner(engine);
  const storage = createMemoryStorage();
  const lineage = await createLineageStore(storage);

  const server = createFilesystemServer({
    rootPath: tmpDir,
    classification: "CONFIDENTIAL",
  });

  const gateway = createMcpGateway({
    hookRunner: runner,
    lineageStore: lineage,
  });

  gateway.registerServer({
    uri: "filesystem://local",
    name: "filesystem",
    status: "CLASSIFIED",
    classification: "CONFIDENTIAL",
  });

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });

  // Call through gateway — should taint session
  const result = await gateway.callTool({
    serverUri: "filesystem://local",
    toolName: "read_file",
    arguments: { path: "secret.txt" },
    session,
    mcpServer: server,
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    // Session taint should be escalated
    assertEquals(result.value.sessionTaint, "CONFIDENTIAL");
    // Lineage record should exist
    assertExists(result.value.lineageId);
  }

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("E2E: write-down blocked after taint escalation", async () => {
  const tmpDir = await Deno.makeTempDir();
  await Deno.writeTextFile(`${tmpDir}/secret.txt`, "classified");

  const engine = createPolicyEngine();
  for (const r of createDefaultRules()) engine.addRule(r);
  const runner = createHookRunner(engine);

  const session = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  // Taint the session to CONFIDENTIAL
  const tainted = updateTaint(session, "CONFIDENTIAL", "read secret file");

  // PRE_OUTPUT to PUBLIC should be blocked
  const result = await runner.run("PRE_OUTPUT", {
    session: tainted,
    input: { target_classification: "PUBLIC" },
  });
  assertEquals(result.allowed, false);
  assertEquals(result.action, "BLOCK");

  await Deno.remove(tmpDir, { recursive: true });
});
