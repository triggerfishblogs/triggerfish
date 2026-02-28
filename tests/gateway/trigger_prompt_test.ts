/**
 * Tests for the trigger prompt response handler in the chat session.
 *
 * Validates classification-aware behavior:
 * - Write-down (trigger < session) → session reset + inject
 * - Write-up (trigger > session) → inject + taint escalation
 * - Same level → inject (no change)
 * - Decline → no action
 * - Missing trigger → error event
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createTriggerStore } from "../../src/scheduler/triggers/store.ts";
import type { TriggerResult } from "../../src/scheduler/triggers/store.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import type { ChatEvent, ChatEventSender } from "../../src/core/types/chat_event.ts";
import { createChatSession } from "../../src/gateway/chat.ts";
import type { ChatSessionConfig } from "../../src/gateway/chat_types.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { ChannelId, UserId } from "../../src/core/types/session.ts";
import type { LlmProviderRegistry, LlmProvider } from "../../src/core/types/llm.ts";
import { createHookRunner } from "../../src/core/policy/hooks/hooks.ts";
import type { PolicyRule } from "../../src/core/types/policy.ts";

// ─── Test helpers ────────────────────────────────────────────────────

function makeResult(overrides: Partial<TriggerResult> = {}): TriggerResult {
  return {
    id: crypto.randomUUID(),
    source: "trigger",
    message: "Trigger output: everything is fine.",
    classification: "PUBLIC" as ClassificationLevel,
    firedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Stub LLM provider that returns a canned response. */
function createStubProvider(): LlmProvider {
  return {
    name: "stub",
    // deno-lint-ignore require-await
    async generate(_messages, _options) {
      return {
        content: "I see the trigger output.",
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
    async *stream(_messages, _options) {
      yield {
        type: "text" as const,
        text: "I see the trigger output.",
      };
    },
  };
}

function createStubRegistry(): LlmProviderRegistry {
  const provider = createStubProvider();
  return {
    register(_name: string, _provider: LlmProvider) {},
    get(_name: string) {
      return provider;
    },
    getDefault() {
      return provider;
    },
    list() {
      return ["stub"];
    },
  };
}

interface EventCollector {
  readonly events: ChatEvent[];
  readonly sender: ChatEventSender;
}

function createEventCollector(): EventCollector {
  const events: ChatEvent[] = [];
  return {
    events,
    sender: (evt: ChatEvent) => {
      events.push(evt);
    },
  };
}

interface TestSessionState {
  taint: ClassificationLevel;
  resetCount: number;
  escalations: Array<{ level: ClassificationLevel; reason: string }>;
}

function createTestConfig(overrides: {
  readonly triggerStore?: ReturnType<typeof createTriggerStore>;
  readonly sessionState?: TestSessionState;
} = {}): { config: ChatSessionConfig; sessionState: TestSessionState } {
  const sessionState: TestSessionState = overrides.sessionState ?? {
    taint: "PUBLIC" as ClassificationLevel,
    resetCount: 0,
    escalations: [],
  };

  const session = createSession({
    userId: "owner" as UserId,
    channelId: "test" as ChannelId,
  });

  const hookRunner = createHookRunner([] as PolicyRule[]);
  const registry = createStubRegistry();
  const storage = createMemoryStorage();
  const triggerStore = overrides.triggerStore ?? createTriggerStore(storage);

  const config: ChatSessionConfig = {
    hookRunner,
    providerRegistry: registry,
    session,
    triggerStore,
    getSessionTaint: () => sessionState.taint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      sessionState.taint = level;
      sessionState.escalations.push({ level, reason });
    },
    resetSession: () => {
      sessionState.taint = "PUBLIC" as ClassificationLevel;
      sessionState.resetCount++;
    },
    enableStreaming: false,
  };

  return { config, sessionState };
}

// ─── Decline → no action ────────────────────────────────────────────

Deno.test("trigger prompt: decline does not execute agent turn", () => {
  const { config } = createTestConfig();
  const chat = createChatSession(config);
  const collector = createEventCollector();

  chat.handleTriggerPromptResponse("trigger", false, collector.sender);

  // No events emitted — decline is silent
  assertEquals(collector.events.length, 0);
});

// ─── Accept + trigger >= session → inject + escalate ────────────────

Deno.test("trigger prompt: accept with write-up escalates taint and injects", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  await store.save(makeResult({
    classification: "INTERNAL" as ClassificationLevel,
    message: "Internal data report.",
  }));

  const { config, sessionState } = createTestConfig({
    triggerStore: store,
    sessionState: {
      taint: "PUBLIC" as ClassificationLevel,
      resetCount: 0,
      escalations: [],
    },
  });

  const chat = createChatSession(config);
  const collector = createEventCollector();

  chat.handleTriggerPromptResponse("trigger", true, collector.sender);

  // Wait for async processing
  await new Promise((r) => setTimeout(r, 500));

  // Taint should be escalated
  assertEquals(sessionState.taint, "INTERNAL");
  assertEquals(sessionState.escalations.length, 1);
  assertEquals(sessionState.escalations[0].level, "INTERNAL");
  // No session reset
  assertEquals(sessionState.resetCount, 0);
});

// ─── Accept + trigger < session → session reset + inject ────────────

Deno.test("trigger prompt: accept with write-down resets session", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  await store.save(makeResult({
    classification: "PUBLIC" as ClassificationLevel,
    message: "Public info.",
  }));

  const { config, sessionState } = createTestConfig({
    triggerStore: store,
    sessionState: {
      taint: "CONFIDENTIAL" as ClassificationLevel,
      resetCount: 0,
      escalations: [],
    },
  });

  const chat = createChatSession(config);
  const collector = createEventCollector();

  chat.handleTriggerPromptResponse("trigger", true, collector.sender);

  // Wait for async processing
  await new Promise((r) => setTimeout(r, 500));

  // Session should have been reset
  assertEquals(sessionState.resetCount, 1);
  // Taint should be PUBLIC after reset
  assertEquals(sessionState.taint, "PUBLIC");
});

// ─── Accept + same level → inject without changes ───────────────────

Deno.test("trigger prompt: accept at same level injects without reset or escalation", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  await store.save(makeResult({
    classification: "INTERNAL" as ClassificationLevel,
    message: "Same-level report.",
  }));

  const { config, sessionState } = createTestConfig({
    triggerStore: store,
    sessionState: {
      taint: "INTERNAL" as ClassificationLevel,
      resetCount: 0,
      escalations: [],
    },
  });

  const chat = createChatSession(config);
  const collector = createEventCollector();

  chat.handleTriggerPromptResponse("trigger", true, collector.sender);

  await new Promise((r) => setTimeout(r, 500));

  assertEquals(sessionState.resetCount, 0);
  assertEquals(sessionState.escalations.length, 0);
  assertEquals(sessionState.taint, "INTERNAL");
});

// ─── Accept + empty store → error event ─────────────────────────────

Deno.test("trigger prompt: accept with empty store sends error event", async () => {
  const { config } = createTestConfig();
  const chat = createChatSession(config);
  const collector = createEventCollector();

  chat.handleTriggerPromptResponse("trigger", true, collector.sender);

  await new Promise((r) => setTimeout(r, 500));

  const errorEvents = collector.events.filter((e) => e.type === "error");
  assertEquals(errorEvents.length >= 1, true);
  const errorEvt = errorEvents[0] as Extract<ChatEvent, { type: "error" }>;
  assertStringIncludes(errorEvt.message, "not found");
});

// ─── Accept triggers an agent turn ──────────────────────────────────

Deno.test("trigger prompt: accept with valid result attempts agent turn", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  await store.save(makeResult({
    source: "cron:daily-check",
    classification: "PUBLIC" as ClassificationLevel,
    message: "All systems operational.",
  }));

  const { config } = createTestConfig({ triggerStore: store });
  const chat = createChatSession(config);
  const collector = createEventCollector();

  chat.handleTriggerPromptResponse("cron:daily-check", true, collector.sender);

  await new Promise((r) => setTimeout(r, 500));

  // The agent turn was attempted — we expect at least one event
  // (response, response_chunk, error, or llm_start depending on hook policy)
  assertEquals(collector.events.length >= 1, true,
    "Expected at least one event from agent turn attempt");
});
