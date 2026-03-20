/**
 * Generic nonce-based prompt system for out-of-band user interaction.
 *
 * Provides a single generic mechanism for all prompt types: secrets,
 * credentials, confirmations, etc. Each prompt sends a WebSocket event
 * to the client, which responds with a nonce-correlated response.
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import type { ChatEvent, ChatEventSender } from "./chat_types.ts";

const chatLog = createLogger("chat");

// ─── Generic pending prompt ──────────────────────────────────────────────────

/**
 * A pending prompt registry — stores nonce-keyed resolve callbacks.
 *
 * All prompt types (secret, credential, confirm) use this same structure.
 */
export interface PendingPromptRegistry<T> {
  readonly map: Map<string, (value: T) => void>;
  readonly label: string;
}

/** Create a new pending prompt registry. */
export function createPromptRegistry<T>(
  label: string,
): PendingPromptRegistry<T> {
  return { map: new Map(), label };
}

/**
 * Resolve a pending prompt by nonce.
 *
 * Looks up the resolve callback, removes it from the registry, and
 * calls it with the provided value. Logs a warning if the nonce is
 * not found (stale or duplicate response).
 */
export function resolvePrompt<T>(
  registry: PendingPromptRegistry<T>,
  nonce: string,
  value: T,
): void {
  const resolve = registry.map.get(nonce);
  if (resolve) {
    registry.map.delete(nonce);
    chatLog.debug(`${registry.label} prompt resolved`, {
      operation: `resolve${registry.label}Prompt`,
      nonce,
    });
    resolve(value);
  } else {
    chatLog.debug(`${registry.label} prompt nonce not found, dropping`, {
      operation: `resolve${registry.label}Prompt`,
      nonce,
    });
  }
}

/**
 * Create a Tidepool prompt callback that sends an event and waits
 * for the client to resolve the nonce.
 */
export function buildTidepoolPrompt<T>(
  registry: PendingPromptRegistry<T>,
  sendEvent: ChatEventSender,
  buildEvent: (nonce: string) => ChatEvent,
): Promise<T> {
  const nonce = crypto.randomUUID();
  return new Promise<T>((resolve) => {
    registry.map.set(nonce, resolve);
    sendEvent(buildEvent(nonce));
  });
}

// ─── Typed prompt builders (thin wrappers over the generic) ──────────────────

/** Create a secret prompt callback for Tidepool mode. */
export function buildTidepoolSecretPrompt(
  registry: PendingPromptRegistry<string | null>,
  sendEvent: ChatEventSender,
): (name: string, hint?: string) => Promise<string | null> {
  return (name, hint) =>
    buildTidepoolPrompt(
      registry,
      sendEvent,
      (nonce) =>
        hint !== undefined
          ? { type: "secret_prompt", nonce, name, hint }
          : { type: "secret_prompt", nonce, name },
    );
}

/** Credential prompt resolution value. */
export interface CredentialResult {
  readonly username: string;
  readonly password: string;
}

/** Create a credential prompt callback for Tidepool mode. */
export function buildTidepoolCredentialPrompt(
  registry: PendingPromptRegistry<CredentialResult | null>,
  sendEvent: ChatEventSender,
): (name: string, hint?: string) => Promise<CredentialResult | null> {
  return (name, hint) =>
    buildTidepoolPrompt(
      registry,
      sendEvent,
      (nonce) =>
        hint !== undefined
          ? { type: "credential_prompt", nonce, name, hint }
          : { type: "credential_prompt", nonce, name },
    );
}

/** Create a confirm prompt callback for Tidepool mode. */
export function buildTidepoolConfirmPrompt(
  registry: PendingPromptRegistry<boolean>,
  sendEvent: ChatEventSender,
): (message: string) => Promise<boolean> {
  return (message) =>
    buildTidepoolPrompt(registry, sendEvent, (nonce) => ({
      type: "confirm_prompt",
      nonce,
      message,
    }));
}

// ─── Legacy resolve wrappers (for callers that pass raw values) ──────────────

/** Resolve a secret prompt — value is string | null directly. */
export function resolveSecretPrompt(
  registry: PendingPromptRegistry<string | null>,
  nonce: string,
  value: string | null,
): void {
  resolvePrompt(registry, nonce, value);
}

/**
 * Resolve a credential prompt — assembles username+password into
 * CredentialResult or null if cancelled.
 */
export function resolveCredentialPrompt(
  registry: PendingPromptRegistry<CredentialResult | null>,
  nonce: string,
  username: string | null,
  password: string | null,
): void {
  const value = username !== null && password !== null
    ? { username, password }
    : null;
  resolvePrompt(registry, nonce, value);
}

/** Resolve a confirm prompt — approved boolean directly. */
export function resolveConfirmPrompt(
  registry: PendingPromptRegistry<boolean>,
  nonce: string,
  approved: boolean,
): void {
  resolvePrompt(registry, nonce, approved);
}
