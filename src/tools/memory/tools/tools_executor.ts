/**
 * Memory tool executor — classification-gated execution of memory operations.
 *
 * Provides the executor factory that wires memory tool invocations to the
 * underlying MemoryStore and MemorySearchProvider. Classification is always
 * forced to session taint — the LLM cannot choose what level a memory is
 * stored at.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { SessionId } from "../../../core/types/session.ts";
import type { MemoryStore } from "../store.ts";
import type { MemorySearchProvider } from "../search/mod.ts";

/** Context required by the memory tool executor. */
export interface MemoryToolContext {
  readonly store: MemoryStore;
  readonly searchProvider?: MemorySearchProvider;
  readonly agentId: string;
  readonly sessionTaint: ClassificationLevel;
  readonly sourceSessionId: SessionId;
}

// ─── Executor Helpers ──────────────────────────────────────────────────────────

async function executeMemorySave(
  ctx: MemoryToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const key = input.key;
  const content = input.content;
  if (typeof key !== "string" || key.length === 0) {
    return "Error: memory_save requires a 'key' argument (non-empty string).";
  }
  if (typeof content !== "string" || content.length === 0) {
    return "Error: memory_save requires a 'content' argument (non-empty string).";
  }

  const tags = Array.isArray(input.tags)
    ? input.tags.filter((t): t is string => typeof t === "string")
    : [];

  const result = await ctx.store.save({
    key,
    agentId: ctx.agentId,
    sessionTaint: ctx.sessionTaint,
    content,
    tags,
    sourceSessionId: ctx.sourceSessionId,
  });

  if (!result.ok) {
    return `Error: ${result.error.message}`;
  }

  return JSON.stringify({
    saved: true,
    key: result.value.key,
    classification: result.value.classification,
  });
}

async function executeMemoryGet(
  ctx: MemoryToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const key = input.key;
  if (typeof key !== "string" || key.length === 0) {
    return "Error: memory_get requires a 'key' argument (non-empty string).";
  }

  const record = await ctx.store.get({
    key,
    agentId: ctx.agentId,
    sessionTaint: ctx.sessionTaint,
  });

  if (record === null) {
    return JSON.stringify({ found: false, key });
  }

  return JSON.stringify({
    found: true,
    key: record.key,
    content: record.content,
    classification: record.classification,
    tags: record.tags,
    updated_at: record.updatedAt.toISOString(),
  });
}

async function executeMemorySearch(
  ctx: MemoryToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const query = input.query;
  if (typeof query !== "string" || query.length === 0) {
    return "Error: memory_search requires a 'query' argument (non-empty string).";
  }

  const maxResults = typeof input.max_results === "number"
    ? input.max_results
    : 10;

  if (!ctx.searchProvider) {
    return "Error: Search is not available (no search provider configured).";
  }

  const results = await ctx.searchProvider.search({
    agentId: ctx.agentId,
    query,
    sessionTaint: ctx.sessionTaint,
    maxResults,
  });

  if (results.length === 0) {
    return JSON.stringify({ results: [], query });
  }

  return formatSearchResults(results, query);
}

function formatSearchResults(
  results: Awaited<ReturnType<MemorySearchProvider["search"]>>,
  query: string,
): string {
  return JSON.stringify({
    results: results.map((r) => ({
      key: r.record.key,
      content: r.record.content,
      classification: r.record.classification,
      tags: r.record.tags,
    })),
    query,
  });
}

async function executeMemoryList(
  ctx: MemoryToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const tag = typeof input.tag === "string" ? input.tag : undefined;

  const records = await ctx.store.list({
    agentId: ctx.agentId,
    sessionTaint: ctx.sessionTaint,
    tag,
  });

  if (records.length === 0) {
    return "No memories found.";
  }

  return formatListResults(records);
}

function formatListResults(
  records: Awaited<ReturnType<MemoryStore["list"]>>,
): string {
  return JSON.stringify({
    memories: records.map((r) => ({
      key: r.key,
      content: r.content,
      classification: r.classification,
      tags: r.tags,
      updated_at: r.updatedAt.toISOString(),
    })),
  });
}

async function executeMemoryDelete(
  ctx: MemoryToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const key = input.key;
  if (typeof key !== "string" || key.length === 0) {
    return "Error: memory_delete requires a 'key' argument (non-empty string).";
  }

  const result = await ctx.store.delete({
    key,
    agentId: ctx.agentId,
    sessionTaint: ctx.sessionTaint,
    sourceSessionId: ctx.sourceSessionId,
  });

  if (!result.ok) {
    return `Error: ${result.error.message}`;
  }

  return JSON.stringify({ deleted: true, key });
}

// ─── Dispatch Table ────────────────────────────────────────────────────────────

type MemoryExecutorFn = (
  ctx: MemoryToolContext,
  input: Record<string, unknown>,
) => Promise<string>;

const MEMORY_EXECUTORS: Readonly<Record<string, MemoryExecutorFn>> = {
  memory_save: executeMemorySave,
  memory_get: executeMemoryGet,
  memory_search: executeMemorySearch,
  memory_list: executeMemoryList,
  memory_delete: executeMemoryDelete,
};

/**
 * Create a tool executor for memory operations.
 *
 * Returns a handler that accepts tool name + args and returns a result string,
 * or null if the tool name is not a memory tool (so callers can fall through).
 */
export function createMemoryToolExecutor(
  ctx: MemoryToolContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    const executor = MEMORY_EXECUTORS[name];
    if (!executor) return null;
    return executor(ctx, input);
  };
}
