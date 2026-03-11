/**
 * Secret and credential prompt helpers for Tidepool mode.
 *
 * Handles the nonce-based request/response pattern for prompting
 * users for secrets and credentials via WebSocket events.
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import type { ChatEventSender } from "./chat_types.ts";

const chatLog = createLogger("chat");

/** Resolve a pending secret prompt by nonce. */
export function resolveSecretPrompt(
  pendingSecretPrompts: Map<string, (value: string | null) => void>,
  nonce: string,
  value: string | null,
): void {
  const resolve = pendingSecretPrompts.get(nonce);
  if (resolve) {
    pendingSecretPrompts.delete(nonce);
    chatLog.debug("Secret prompt resolved", {
      operation: "resolveSecretPrompt",
      nonce,
      hasValue: value !== null,
    });
    resolve(value);
  } else {
    chatLog.debug("Secret prompt nonce not found, dropping", {
      operation: "resolveSecretPrompt",
      nonce,
    });
  }
}

/** Create a secret prompt callback for Tidepool mode. */
export function buildTidepoolSecretPrompt(
  pendingSecretPrompts: Map<string, (value: string | null) => void>,
  sendEvent: ChatEventSender,
): (name: string, hint?: string) => Promise<string | null> {
  return (name, hint) => {
    const nonce = crypto.randomUUID();
    return new Promise<string | null>((resolve) => {
      pendingSecretPrompts.set(nonce, resolve);
      sendEvent(
        hint !== undefined
          ? { type: "secret_prompt", nonce, name, hint }
          : { type: "secret_prompt", nonce, name },
      );
    });
  };
}

/** Credential prompt resolution value. */
export interface CredentialResult {
  readonly username: string;
  readonly password: string;
}

/** Resolve a pending credential prompt by nonce. */
export function resolveCredentialPrompt(
  pendingCredentialPrompts: Map<
    string,
    (value: CredentialResult | null) => void
  >,
  nonce: string,
  username: string | null,
  password: string | null,
): void {
  const resolve = pendingCredentialPrompts.get(nonce);
  if (resolve) {
    pendingCredentialPrompts.delete(nonce);
    if (username !== null && password !== null) {
      chatLog.debug("Credential prompt resolved", {
        operation: "resolveCredentialPrompt",
        nonce,
      });
      resolve({ username, password });
    } else {
      chatLog.debug("Credential prompt cancelled by client", {
        operation: "resolveCredentialPrompt",
        nonce,
      });
      resolve(null);
    }
  } else {
    chatLog.debug("Credential prompt nonce not found, dropping", {
      operation: "resolveCredentialPrompt",
      nonce,
    });
  }
}

/** Create a credential prompt callback for Tidepool mode. */
export function buildTidepoolCredentialPrompt(
  pendingCredentialPrompts: Map<
    string,
    (value: CredentialResult | null) => void
  >,
  sendEvent: ChatEventSender,
): (name: string, hint?: string) => Promise<CredentialResult | null> {
  return (name, hint) => {
    const nonce = crypto.randomUUID();
    return new Promise<CredentialResult | null>((resolve) => {
      pendingCredentialPrompts.set(nonce, resolve);
      sendEvent(
        hint !== undefined
          ? { type: "credential_prompt", nonce, name, hint }
          : { type: "credential_prompt", nonce, name },
      );
    });
  };
}
