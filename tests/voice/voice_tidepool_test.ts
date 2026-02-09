/**
 * Phase 19: Voice Pipeline & Canvas/A2UI
 * Tests MUST FAIL until voice and tide pool modules are implemented.
 */
import { assertEquals, assertExists } from "jsr:@std/assert";
import type { SttProvider, TtsProvider } from "../../src/voice/mod.ts";
import { createTidepoolHost, createTidepoolTools } from "../../src/tidepool/mod.ts";

// --- Voice provider interfaces ---

Deno.test("SttProvider: interface exists with transcribe method", async () => {
  const { createSttProviderRegistry } = await import("../../src/voice/stt.ts");
  const registry = createSttProviderRegistry();
  assertExists(registry.register);
  assertExists(registry.get);
});

Deno.test("TtsProvider: interface exists with synthesize method", async () => {
  const { createTtsProviderRegistry } = await import("../../src/voice/tts.ts");
  const registry = createTtsProviderRegistry();
  assertExists(registry.register);
  assertExists(registry.get);
});

// --- Canvas ---

Deno.test("TidepoolTools: push sends HTML content", async () => {
  let pushed: string | null = null;
  const host = createTidepoolHost({
    onPush: (html) => { pushed = html; },
  });
  const tools = createTidepoolTools(host);
  await tools.push("<h1>Hello</h1>");
  assertEquals(pushed, "<h1>Hello</h1>");
});

Deno.test("TidepoolTools: reset clears tide pool", async () => {
  let resetCalled = false;
  const host = createTidepoolHost({
    onPush: () => {},
    onReset: () => { resetCalled = true; },
  });
  const tools = createTidepoolTools(host);
  await tools.reset();
  assertEquals(resetCalled, true);
});
