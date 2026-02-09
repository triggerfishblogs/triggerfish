/**
 * Tests for conversation compactor.
 *
 * Covers token estimation, sliding window compaction,
 * LLM-based summarization, and edge cases.
 *
 * @module
 */

import { assertEquals, assertGreater, assertLessOrEqual } from "@std/assert";
import {
  createCompactor,
  estimateTokens,
  estimateHistoryTokens,
} from "../../src/agent/compactor.ts";
import type { HistoryEntry } from "../../src/agent/orchestrator.ts";

// ─── Token estimation ──────────────────────────────────────────

Deno.test("estimateTokens returns ~4 chars per token", () => {
  assertEquals(estimateTokens(""), 0);
  assertEquals(estimateTokens("hello"), 2); // ceil(5/4) = 2
  assertEquals(estimateTokens("a".repeat(100)), 25);
  assertEquals(estimateTokens("a".repeat(101)), 26);
});

Deno.test("estimateHistoryTokens sums all entries", () => {
  const history: HistoryEntry[] = [
    { role: "user", content: "a".repeat(40) },     // 10 tokens
    { role: "assistant", content: "b".repeat(80) }, // 20 tokens
  ];
  assertEquals(estimateHistoryTokens(history), 30);
});

Deno.test("estimateHistoryTokens returns 0 for empty history", () => {
  assertEquals(estimateHistoryTokens([]), 0);
});

// ─── Sliding window compaction ──────────────────────────────────

Deno.test("compact returns history unchanged when under budget", () => {
  const history: HistoryEntry[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
    { role: "user", content: "How are you?" },
    { role: "assistant", content: "I'm doing well." },
  ];
  const compactor = createCompactor({ contextBudget: 100000 });
  const result = compactor.compact(history);
  assertEquals(result, history);
});

Deno.test("compact triggers when tokens exceed 70% of budget", () => {
  // Create history that exceeds threshold
  // Budget: 100 tokens → threshold: 70 tokens → 280 chars
  const history: HistoryEntry[] = [];
  for (let i = 0; i < 20; i++) {
    history.push({ role: "user", content: `Message ${i}: ${"x".repeat(20)}` });
    history.push({ role: "assistant", content: `Response ${i}: ${"y".repeat(20)}` });
  }
  // 40 messages * ~30 chars each = ~300 tokens, well over 70

  const compactor = createCompactor({
    contextBudget: 100,
    preserveRecentTurns: 3,
  });
  const result = compactor.compact(history);

  // Should be shorter than original
  assertGreater(history.length, result.length);

  // Last 6 messages (3 turns) should be preserved verbatim
  const lastOriginal = history.slice(-6);
  const lastCompacted = result.slice(-6);
  assertEquals(lastCompacted, lastOriginal);
});

Deno.test("compact preserves first 2 messages as context", () => {
  const history: HistoryEntry[] = [];
  for (let i = 0; i < 30; i++) {
    history.push({ role: "user", content: `Msg ${i}: ${"x".repeat(20)}` });
    history.push({ role: "assistant", content: `Reply ${i}: ${"y".repeat(20)}` });
  }

  const compactor = createCompactor({
    contextBudget: 100,
    preserveRecentTurns: 3,
  });
  const result = compactor.compact(history);

  // First 2 messages should be original context
  assertEquals(result[0], history[0]);
  assertEquals(result[1], history[1]);
});

Deno.test("compact inserts summary message for dropped messages", () => {
  const history: HistoryEntry[] = [];
  for (let i = 0; i < 20; i++) {
    history.push({ role: "user", content: `Topic ${i}: ${"x".repeat(20)}` });
    history.push({ role: "assistant", content: `Answer ${i}: ${"y".repeat(20)}` });
  }

  const compactor = createCompactor({
    contextBudget: 100,
    preserveRecentTurns: 3,
  });
  const result = compactor.compact(history);

  // Third message should be the summary placeholder
  assertEquals(result[2].role, "user");
  assertEquals(result[2].content.startsWith("[Previous conversation:"), true);
});

Deno.test("compact handles history shorter than preserve window", () => {
  const history: HistoryEntry[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi!" },
  ];
  const compactor = createCompactor({
    contextBudget: 1, // Very low budget
    preserveRecentTurns: 10,
  });
  const result = compactor.compact(history);
  // Can't compact below the preserve window — return as-is
  assertEquals(result, history);
});

Deno.test("compact handles empty history", () => {
  const compactor = createCompactor({ contextBudget: 100 });
  const result = compactor.compact([]);
  assertEquals(result, []);
});

// ─── LLM summarization ─────────────────────────────────────────

Deno.test("summarize calls provider and replaces old messages", async () => {
  const history: HistoryEntry[] = [
    { role: "user", content: "What is TypeScript?" },
    { role: "assistant", content: "TypeScript is a typed superset of JavaScript." },
    { role: "user", content: "How do I use interfaces?" },
    { role: "assistant", content: "Define them with the interface keyword." },
    { role: "user", content: "What about generics?" },
    { role: "assistant", content: "Use angle brackets for type parameters." },
    { role: "user", content: "Thanks!" },
    { role: "assistant", content: "You're welcome!" },
  ];

  // Mock LLM provider
  const mockProvider = {
    name: "mock",
    supportsStreaming: false,
    complete: async () => ({
      content: "User asked about TypeScript features: interfaces and generics.",
      toolCalls: [],
      usage: { inputTokens: 100, outputTokens: 20 },
    }),
  };

  const compactor = createCompactor({ preserveRecentTurns: 2 });
  const result = await compactor.summarize(history, mockProvider);

  // Should have: summary + last 4 messages (2 turns)
  assertEquals(result.length, 5);
  assertEquals(result[0].role, "user");
  assertEquals(result[0].content.includes("TypeScript features"), true);

  // Last 4 messages preserved
  assertEquals(result[1], history[4]);
  assertEquals(result[2], history[5]);
  assertEquals(result[3], history[6]);
  assertEquals(result[4], history[7]);
});

Deno.test("summarize preserves all messages when history too short", async () => {
  const history: HistoryEntry[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi!" },
  ];

  const mockProvider = {
    name: "mock",
    supportsStreaming: false,
    complete: async () => ({
      content: "Should not be called",
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    }),
  };

  const compactor = createCompactor({ preserveRecentTurns: 2 });
  const result = await compactor.summarize(history, mockProvider);
  assertEquals(result, history);
});

// ─── estimateTokens utility ─────────────────────────────────────

Deno.test("compactor.estimateTokens matches standalone function", () => {
  const history: HistoryEntry[] = [
    { role: "user", content: "a".repeat(400) },
  ];
  const compactor = createCompactor();
  assertEquals(compactor.getTokenEstimate(history), estimateHistoryTokens(history));
});

// ─── Keyword extraction from dropped messages ────────────────────

Deno.test("compact summary includes keywords from dropped user messages", () => {
  const history: HistoryEntry[] = [];
  // Create messages with distinct topics
  const topics = ["authentication", "database", "routing", "deployment"];
  for (const topic of topics) {
    history.push({ role: "user", content: `Tell me about ${topic} patterns` });
    history.push({ role: "assistant", content: `Here's info about ${topic}...` });
  }
  // Add more recent messages
  for (let i = 0; i < 4; i++) {
    history.push({ role: "user", content: `Recent question ${i}` });
    history.push({ role: "assistant", content: `Recent answer ${i}` });
  }

  const compactor = createCompactor({
    contextBudget: 50,
    preserveRecentTurns: 2,
  });
  const result = compactor.compact(history);

  // Find the summary message
  const summary = result.find((e) =>
    e.content.startsWith("[Previous conversation:")
  );
  if (summary) {
    // Should contain at least some of the topic keywords
    const hasKeywords = topics.some((t) => summary.content.includes(t));
    assertEquals(hasKeywords, true);
  }
});
