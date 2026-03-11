/**
 * Topic dispatcher for the memory screen.
 *
 * Routes memory search, tags, get, and delete actions to the
 * TidepoolMemoryHandler with session taint enforcement.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { TopicHandler } from "./host_types.ts";
import type { TidepoolMemoryHandler } from "./host_memory.ts";
import { createLogger } from "../../../core/logger/mod.ts";
import { reply } from "./host_dispatch_simple.ts";

const log = createLogger("tidepool-dispatch");

/** Create a topic handler for the memory screen. */
export function createMemoryTopicDispatcher(
  handler: TidepoolMemoryHandler,
  sessionTaintProvider: () => string,
): TopicHandler {
  return (message, socket) => {
    const action = message.action as string;
    const payload = (message.payload ?? {}) as Record<string, unknown>;
    const taint = sessionTaintProvider();

    if (action === "search") {
      dispatchMemorySearch(handler, socket, payload, taint);
    } else if (action === "tags") {
      dispatchMemoryTags(handler, socket, taint);
    } else if (action === "get") {
      dispatchMemoryGet(handler, socket, payload, taint);
    } else if (action === "delete") {
      dispatchMemoryDelete(handler, socket, payload, taint);
    }
  };
}

/** Dispatch memory search action. */
function dispatchMemorySearch(
  handler: TidepoolMemoryHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
  taint: string,
): void {
  handler
    .search(
      {
        query: (payload.query as string) ?? "",
        classification: payload.classification as
          | ClassificationLevel
          | undefined,
        tags: payload.tags as string[] | undefined,
        dateFrom: payload.dateFrom as string | undefined,
        dateTo: payload.dateTo as string | undefined,
      },
      taint,
    )
    .then((result) => {
      reply(socket, { topic: "memory", type: "search_results", ...result });
    })
    .catch((err: unknown) => {
      log.warn("Memory search dispatch failed", {
        operation: "search",
        err,
      });
      reply(socket, {
        topic: "memory",
        type: "search_results",
        entries: [],
        total: 0,
      });
    });
}

/** Dispatch memory tags action. */
function dispatchMemoryTags(
  handler: TidepoolMemoryHandler,
  socket: WebSocket,
  taint: string,
): void {
  handler
    .tags(taint)
    .then((tags) => {
      reply(socket, { topic: "memory", type: "tags", tags });
    })
    .catch((err: unknown) => {
      log.warn("Memory tags dispatch failed", { operation: "tags", err });
      reply(socket, { topic: "memory", type: "tags", tags: [] });
    });
}

/** Dispatch memory get action. */
function dispatchMemoryGet(
  handler: TidepoolMemoryHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
  taint: string,
): void {
  const id = payload.id as string;
  if (!id) return;
  handler
    .get(id, taint)
    .then((entry) => {
      reply(socket, { topic: "memory", type: "entry", entry });
    })
    .catch((err: unknown) => {
      log.warn("Memory get dispatch failed", {
        operation: "get",
        id,
        err,
      });
      reply(socket, { topic: "memory", type: "entry", entry: null });
    });
}

/** Dispatch memory delete action. */
function dispatchMemoryDelete(
  handler: TidepoolMemoryHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
  taint: string,
): void {
  const id = payload.id as string;
  if (!id) return;
  handler
    .delete(id, taint)
    .then((ok) => {
      reply(socket, { topic: "memory", type: "deleted", id, ok });
    })
    .catch((err: unknown) => {
      log.warn("Memory delete dispatch failed", {
        operation: "delete",
        id,
        err,
      });
      reply(socket, { topic: "memory", type: "deleted", id, ok: false });
    });
}
