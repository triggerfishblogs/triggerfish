/**
 * Chat wire protocol event types.
 *
 * Extracted into core so that channels/ can depend on these types
 * without importing from gateway/.
 *
 * @module
 */

import type { ClassificationLevel } from "./classification.ts";
import type { MessageContent } from "../image/content.ts";

/** Events sent over the chat wire protocol. */
export type ChatEvent =
  | {
    readonly type: "connected";
    readonly provider: string;
    readonly model: string;
    readonly taint?: ClassificationLevel;
    readonly workspace?: string;
  }
  | {
    readonly type: "llm_start";
    readonly iteration: number;
    readonly maxIterations: number;
  }
  | {
    readonly type: "llm_complete";
    readonly iteration: number;
    readonly hasToolCalls: boolean;
  }
  | {
    readonly type: "tool_call";
    readonly name: string;
    readonly args: Record<string, unknown>;
  }
  | {
    readonly type: "tool_result";
    readonly name: string;
    readonly result: string;
    readonly blocked: boolean;
  }
  | { readonly type: "response"; readonly text: string }
  | {
    readonly type: "response_chunk";
    readonly text: string;
    readonly done: boolean;
  }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "vision_start"; readonly imageCount: number }
  | { readonly type: "vision_complete"; readonly imageCount: number }
  | { readonly type: "compact_start" }
  | {
    readonly type: "compact_complete";
    readonly messagesBefore: number;
    readonly messagesAfter: number;
    readonly tokensBefore: number;
    readonly tokensAfter: number;
  }
  | { readonly type: "taint_changed"; readonly level: ClassificationLevel }
  | {
    /**
     * Server → client: MCP server connection status indicator.
     * Sent on new connection and whenever connection state changes.
     */
    readonly type: "mcp_status";
    /** Number of currently connected MCP servers. */
    readonly connected: number;
    /** Total number of configured (non-disabled) MCP servers. */
    readonly configured: number;
  }
  | {
    /**
     * Server → browser: request the user to securely enter a secret value.
     * The browser must show a password input form and respond with
     * `secret_prompt_response`.
     */
    readonly type: "secret_prompt";
    /** Unique nonce correlating this request with the response. */
    readonly nonce: string;
    /** The secret name being collected. */
    readonly name: string;
    /** Optional human-readable hint for the user. */
    readonly hint?: string;
  }
  | {
    /**
     * Server → browser: request the user to securely enter a username and
     * password credential pair. The browser must show a two-field form and
     * respond with `credential_prompt_response`.
     */
    readonly type: "credential_prompt";
    /** Unique nonce correlating this request with the response. */
    readonly nonce: string;
    /** The credential group name (e.g. "email_smtp"). */
    readonly name: string;
    /** Optional human-readable hint for the user. */
    readonly hint?: string;
  }
  /** Server → client: a trigger/scheduler notification delivered to the owner. */
  | { readonly type: "notification"; readonly message: string }
  /** Server → client: a trigger produced actionable output; prompt user to add to context. */
  | {
    readonly type: "trigger_prompt";
    readonly source: string;
    readonly classification: ClassificationLevel;
    readonly preview: string;
    readonly firedAt: string;
  }
  /** Server → client: cancel acknowledged — the in-flight request was aborted. */
  | { readonly type: "cancelled" };

/** Messages the client can send. */
export type ChatClientMessage =
  | { readonly type: "message"; readonly content: MessageContent }
  | { readonly type: "cancel" }
  | { readonly type: "clear" }
  | { readonly type: "compact" }
  | {
    /**
     * Browser → server: the user has entered a secret value in the password
     * form triggered by a `secret_prompt` event.
     */
    readonly type: "secret_prompt_response";
    /** The nonce from the originating `secret_prompt` event. */
    readonly nonce: string;
    /** The secret value entered by the user, or null if cancelled. */
    readonly value: string | null;
  }
  | {
    /**
     * Browser → server: the user has entered a username+password credential
     * in the two-field form triggered by a `credential_prompt` event.
     */
    readonly type: "credential_prompt_response";
    /** The nonce from the originating `credential_prompt` event. */
    readonly nonce: string;
    /** The username entered by the user, or null if cancelled. */
    readonly username: string | null;
    /** The password entered by the user, or null if cancelled. */
    readonly password: string | null;
  }
  | {
    /**
     * Client → server: the user accepted or dismissed a trigger prompt.
     */
    readonly type: "trigger_prompt_response";
    /** The trigger source identifier. */
    readonly source: string;
    /** Whether the user accepted (true) or dismissed (false). */
    readonly accepted: boolean;
  };

/** Callback to send a chat event to a specific client. */
export type ChatEventSender = (event: ChatEvent) => void;
