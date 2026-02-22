/**
 * MCP Server Classification — assigns trust state and classification level to MCP servers.
 *
 * All MCP servers default to UNTRUSTED and cannot be invoked until explicitly
 * classified. Server states: UNTRUSTED (default), CLASSIFIED (after review), BLOCKED.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("security");

/** Trust state of an MCP server. */
export type ServerStatus = "UNTRUSTED" | "CLASSIFIED" | "BLOCKED";

/** Classification state of an MCP server. */
export interface ServerState {
  readonly uri: string;
  readonly name: string;
  readonly status: ServerStatus;
  readonly classification?: ClassificationLevel;
}

/** Options for classifying an MCP server. */
export interface ClassifyServerOptions {
  readonly uri: string;
  readonly name: string;
  readonly status?: ServerStatus;
  readonly classification?: ClassificationLevel;
}

/**
 * Create or update an MCP server classification state.
 *
 * Defaults to UNTRUSTED if no status is provided.
 * When status is CLASSIFIED, a classification level should be provided.
 *
 * @param options - Server identification and classification details
 * @returns Immutable server state
 */
export function classifyServer(options: ClassifyServerOptions): ServerState {
  const status = options.status ?? "UNTRUSTED";
  log.info("MCP server classified", {
    uri: options.uri,
    name: options.name,
    status,
    classification: options.classification,
  });

  if (status === "CLASSIFIED" && options.classification !== undefined) {
    return {
      uri: options.uri,
      name: options.name,
      status,
      classification: options.classification,
    };
  }

  return {
    uri: options.uri,
    name: options.name,
    status,
  };
}
