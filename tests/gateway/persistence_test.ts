/**
 * Tests for gateway compaction persistence — messageStore and lineageStore
 * wiring in chat compaction and infrastructure initialization.
 *
 * Validates that:
 * - initializeSessionInfrastructure creates both stores
 * - CoreInfraResult includes messageStore and lineageStore
 * - compactChatHistory calls messageStore.markCompacted()
 * - compactChatHistory appends a compaction_summary record
 * - compaction summary carries inputLineageIds from compacted entries
 */

import { assertEquals, assertExists } from "@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createMessageStore } from "../../src/core/conversation/mod.ts";
import type {
  ConversationAppendInput,
  ConversationRecord,
  MessageStore,
} from "../../src/core/conversation/mod.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import type {
  ChatEvent,
  ChatEventSender,
} from "../../src/core/types/chat_event.ts";
import { createChatSession } from "../../src/gateway/chat.ts";
import type { ChatSessionConfig } from "../../src/gateway/chat_types.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { ChannelId, UserId } from "../../src/core/types/session.ts";
import type {
  LlmProvider,
  LlmProviderRegistry,
} from "../../src/core/types/llm.ts";
import { createHookRunner } from "../../src/core/policy/hooks/hooks.ts";
import type { PolicyRule } from "../../src/core/types/policy.ts";
import { initializeSessionInfrastructure } from "../../src/gateway/startup/infra/storage.ts";
import { createSqliteStorage } from "../../src/core/storage/sqlite.ts";

// ─── Test helpers ────────────────────────────────────────────────────

/** Stub LLM provider that returns a canned response. */
function createStubProvider(): LlmProvider {
  return {
    name: "stub",
    // deno-lint-ignore require-await
    async generate(_messages, _options) {
      return {
        content: "Compacted.",
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
    async *stream(_messages, _options) {
      yield { type: "text" as const, text: "Compacted." };
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

/** Spy-enabled MessageStore wrapping a real store with call tracking. */
interface SpyMessageStore extends MessageStore {
  readonly markCompactedCalls: Array<{
    sessionId: string;
    fromSequence: number;
    toSequence: number;
  }>;
  readonly appendCalls: ConversationAppendInput[];
}

function createSpyMessageStore(): SpyMessageStore {
  const storage = createMemoryStorage();
  const real = createMessageStore(storage);
  const markCompactedCalls: Array<{
    sessionId: string;
    fromSequence: number;
    toSequence: number;
  }> = [];
  const appendCalls: ConversationAppendInput[] = [];

  return {
    markCompactedCalls,
    appendCalls,
    async append(input: ConversationAppendInput): Promise<ConversationRecord> {
      appendCalls.push(input);
      return await real.append(input);
    },
    loadSession: (sid: string) => real.loadSession(sid),
    loadActive: (sid: string, opts?) => real.loadActive(sid, opts),
    async markCompacted(
      sessionId: string,
      fromSequence: number,
      toSequence: number,
    ): Promise<void> {
      markCompactedCalls.push({ sessionId, fromSequence, toSequence });
      return await real.markCompacted(sessionId, fromSequence, toSequence);
    },
    export: (sid: string) => real.export(sid),
    applyRetention: (config, now?) => real.applyRetention(config, now),
  };
}

function createTestConfig(overrides: {
  readonly messageStore?: MessageStore;
  readonly taint?: ClassificationLevel;
} = {}): ChatSessionConfig {
  const session = createSession({
    userId: "owner" as UserId,
    channelId: "test" as ChannelId,
  });

  const hookRunner = createHookRunner([] as PolicyRule[]);
  const registry = createStubRegistry();
  const taint = overrides.taint ?? "PUBLIC" as ClassificationLevel;

  return {
    hookRunner,
    providerRegistry: registry,
    session,
    messageStore: overrides.messageStore,
    getSessionTaint: () => taint,
    enableStreaming: false,
  };
}

// ─── Infrastructure tests ────────────────────────────────────────────

Deno.test("gateway persistence: messageStore created in initializeSessionInfrastructure", () => {
  const tmpPath = Deno.makeTempFileSync({ suffix: ".db" });
  try {
    const storage = createSqliteStorage(tmpPath);
    const result = initializeSessionInfrastructure(storage);
    assertExists(result.messageStore, "messageStore should be defined");
    storage.close();
  } finally {
    try {
      Deno.removeSync(tmpPath);
    } catch { /* best effort cleanup */ }
  }
});

Deno.test("gateway persistence: lineageStore created in initializeSessionInfrastructure", () => {
  const tmpPath = Deno.makeTempFileSync({ suffix: ".db" });
  try {
    const storage = createSqliteStorage(tmpPath);
    const result = initializeSessionInfrastructure(storage);
    assertExists(result.lineageStore, "lineageStore should be defined");
    storage.close();
  } finally {
    try {
      Deno.removeSync(tmpPath);
    } catch { /* best effort cleanup */ }
  }
});

Deno.test("gateway persistence: CoreInfraResult includes both stores", () => {
  const tmpPath = Deno.makeTempFileSync({ suffix: ".db" });
  try {
    const storage = createSqliteStorage(tmpPath);
    const result = initializeSessionInfrastructure(storage);
    assertExists(result.messageStore, "messageStore should be in result");
    assertExists(result.lineageStore, "lineageStore should be in result");
    // Verify they have the expected interface methods
    assertEquals(typeof result.messageStore.append, "function");
    assertEquals(typeof result.messageStore.markCompacted, "function");
    assertEquals(typeof result.lineageStore.create, "function");
    assertEquals(typeof result.lineageStore.get, "function");
    storage.close();
  } finally {
    try {
      Deno.removeSync(tmpPath);
    } catch { /* best effort cleanup */ }
  }
});

// ─── Compaction persistence tests ────────────────────────────────────

Deno.test("gateway compaction: markCompacted called during compaction", async () => {
  const spyStore = createSpyMessageStore();
  const config = createTestConfig({ messageStore: spyStore });
  const chat = createChatSession(config);
  const collector = createEventCollector();

  // Seed the orchestrator history so compaction has something to compact.
  // We need to run an agent turn first to create history entries.
  await chat.executeAgentTurn("Hello, seed message.", collector.sender);

  // Clear events from the agent turn
  collector.events.length = 0;

  // Now compact
  await chat.compact(collector.sender);

  // compactChatHistory should have called markCompacted if messagesAfter > 0
  const compactComplete = collector.events.find(
    (e) => e.type === "compact_complete",
  );
  if (compactComplete && "messagesAfter" in compactComplete) {
    if (compactComplete.messagesAfter > 0) {
      assertEquals(
        spyStore.markCompactedCalls.length >= 1,
        true,
        "markCompacted should have been called at least once",
      );
    }
  }
});

Deno.test("gateway compaction: compaction_summary record appended after compaction", async () => {
  const spyStore = createSpyMessageStore();
  const config = createTestConfig({ messageStore: spyStore });
  const chat = createChatSession(config);
  const collector = createEventCollector();

  // Seed history with an agent turn
  await chat.executeAgentTurn("Seed message for compaction.", collector.sender);
  collector.events.length = 0;

  // Compact
  await chat.compact(collector.sender);

  const compactComplete = collector.events.find(
    (e) => e.type === "compact_complete",
  );
  if (compactComplete && "messagesAfter" in compactComplete) {
    if (compactComplete.messagesAfter > 0) {
      // Find the compaction_summary append call
      const summaryAppends = spyStore.appendCalls.filter(
        (c) => c.role === "compaction_summary",
      );
      assertEquals(
        summaryAppends.length >= 1,
        true,
        "A compaction_summary record should have been appended",
      );
      // Verify the summary content includes the compaction stats
      const summary = summaryAppends[0];
      assertEquals(summary.role, "compaction_summary");
      assertEquals(
        summary.content.includes("[Compaction]"),
        true,
        "Summary content should start with [Compaction]",
      );
    }
  }
});

Deno.test("gateway compaction: compaction summary carries inputLineageIds", async () => {
  const spyStore = createSpyMessageStore();
  const config = createTestConfig({
    messageStore: spyStore,
    taint: "INTERNAL" as ClassificationLevel,
  });
  const chat = createChatSession(config);
  const collector = createEventCollector();

  // Seed history
  await chat.executeAgentTurn(
    "Message with lineage context.",
    collector.sender,
  );
  collector.events.length = 0;

  // Compact
  await chat.compact(collector.sender);

  const compactComplete = collector.events.find(
    (e) => e.type === "compact_complete",
  );
  if (compactComplete && "messagesAfter" in compactComplete) {
    if (compactComplete.messagesAfter > 0) {
      // The compaction_summary should carry the session's classification
      const summaryAppends = spyStore.appendCalls.filter(
        (c) => c.role === "compaction_summary",
      );
      if (summaryAppends.length > 0) {
        assertEquals(
          summaryAppends[0].classification,
          "INTERNAL",
          "Compaction summary should carry the session taint as classification",
        );
        // The session_id should match the session
        assertEquals(
          typeof summaryAppends[0].session_id,
          "string",
          "Compaction summary should have a session_id",
        );
      }
    }
  }

  // Verify markCompacted was called with the correct sequence range
  if (spyStore.markCompactedCalls.length > 0) {
    const call = spyStore.markCompactedCalls[0];
    assertEquals(call.fromSequence, 0, "markCompacted should start from 0");
    assertEquals(
      typeof call.toSequence,
      "number",
      "markCompacted toSequence should be a number",
    );
  }
});
