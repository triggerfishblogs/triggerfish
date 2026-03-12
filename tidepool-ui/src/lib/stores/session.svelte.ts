/**
 * Session store — connection status, taint, provider info.
 */

import type { ClassificationLevel } from "../types.js";
import { onTopic } from "./websocket.svelte.js";

/** Current session taint level. */
let _taint: ClassificationLevel = $state("PUBLIC");

/** Current LLM provider name. */
let _provider: string = $state("");

/** Current LLM model name. */
let _model: string = $state("");

/** Whether taint escalation bumpers are enabled. */
let _bumpersEnabled: boolean = $state(true);

/** MCP servers connected / configured. */
let _mcpConnected: number = $state(0);
let _mcpConfigured: number = $state(0);

/** Get the current session taint level. */
export function getTaint(): ClassificationLevel {
  return _taint;
}

/** Get the current LLM provider name. */
export function getProvider(): string {
  return _provider;
}

/** Get the current LLM model name. */
export function getModel(): string {
  return _model;
}

/** Get the number of connected MCP servers. */
export function getMcpConnected(): number {
  return _mcpConnected;
}

/** Get the number of configured MCP servers. */
export function getMcpConfigured(): number {
  return _mcpConfigured;
}

/** Get whether taint escalation bumpers are enabled. */
export function getBumpersEnabled(): boolean {
  return _bumpersEnabled;
}

/** Handle session-related messages. */
function handleMessage(msg: Record<string, unknown>): void {
  switch (msg.type) {
    case "connected":
      if (msg.provider) _provider = msg.provider as string;
      if (msg.model) _model = msg.model as string;
      if (msg.taint) _taint = msg.taint as ClassificationLevel;
      break;
    case "taint_changed":
      _taint = msg.level as ClassificationLevel;
      break;
    case "mcp_status":
      _mcpConnected = msg.connected as number;
      _mcpConfigured = msg.configured as number;
      break;
    case "bumpers_status":
      _bumpersEnabled = msg.enabled as boolean;
      break;
  }
}

// Subscribe to chat topic for session-level events
onTopic("chat", handleMessage);
