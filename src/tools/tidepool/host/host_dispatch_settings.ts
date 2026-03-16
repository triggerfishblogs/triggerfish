/**
 * Topic dispatcher for the settings screen.
 *
 * Routes get_section and update actions to the TidepoolConfigHandler.
 *
 * @module
 */

import type { TopicHandler } from "./host_types.ts";
import type { TidepoolConfigHandler } from "./host_config.ts";
import { createLogger } from "../../../core/logger/mod.ts";
import { reply } from "./host_dispatch_simple.ts";

const log = createLogger("tidepool-dispatch");

/** Create a topic handler for the settings screen. */
export function createSettingsTopicDispatcher(
  handler: TidepoolConfigHandler,
): TopicHandler {
  return (message, socket) => {
    const action = message.action as string;
    const payload = (message.payload ?? {}) as Record<string, unknown>;

    if (action === "get_section") {
      dispatchGetSection(handler, socket, payload);
    } else if (action === "update") {
      dispatchUpdateSection(handler, socket, payload);
    }
  };
}

/** Dispatch get_section action. */
function dispatchGetSection(
  handler: TidepoolConfigHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
): void {
  const section = payload.section as string;
  handler
    .getSection(
      section as Parameters<TidepoolConfigHandler["getSection"]>[0],
    )
    .then((data) => {
      reply(socket, {
        topic: "settings",
        type: "section_data",
        section,
        data,
      });
    })
    .catch((err: unknown) => {
      log.warn("Settings get_section dispatch failed", {
        operation: "get_section",
        section,
        err,
      });
      const errMessage = err instanceof Error ? err.message : String(err);
      reply(socket, {
        topic: "settings",
        type: "section_data",
        section,
        data: {},
        error: errMessage,
      });
    });
}

/** Dispatch update action. */
function dispatchUpdateSection(
  handler: TidepoolConfigHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
): void {
  const section = payload.section as string;
  const values = payload.values as Record<string, unknown>;
  handler
    .updateSection(
      section as Parameters<TidepoolConfigHandler["updateSection"]>[0],
      values,
    )
    .then((result) => {
      reply(socket, {
        topic: "settings",
        type: "update_result",
        section,
        ...result,
      });
    })
    .catch((err: unknown) => {
      log.warn("Settings update dispatch failed", {
        operation: "update",
        section,
        err,
      });
      const errMessage = err instanceof Error ? err.message : String(err);
      reply(socket, {
        topic: "settings",
        type: "update_result",
        section,
        valid: false,
        errors: [{ field: "_", message: errMessage }],
      });
    });
}
