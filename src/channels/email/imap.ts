/**
 * IMAP client factory and barrel re-exports.
 *
 * Creates real IMAP clients (TLS/TCP) and mock clients for testing.
 * Re-exports all public IMAP types from sub-modules.
 *
 * @module
 */

export type {
  ImapClient,
  ImapClientConfig,
  ImapConnectionState,
  ImapMessage,
} from "./imap_types.ts";

import type {
  ImapClient,
  ImapClientConfig,
  ImapConnectionState,
  ImapMessage,
} from "./imap_types.ts";
import {
  authenticateImapLogin,
  establishImapConnection,
  fetchUnseenImapMessages,
  releaseImapResources,
  sendImapLogout,
} from "./imap_protocol.ts";

/**
 * Create a real IMAP client that connects via TLS.
 *
 * Implements a minimal subset of the IMAP protocol sufficient for:
 * - LOGIN authentication
 * - SELECT INBOX
 * - SEARCH UNSEEN
 * - FETCH message headers + body
 * - STORE +FLAGS (\Seen) to mark messages read
 *
 * @param config - IMAP server connection details
 * @returns An ImapClient instance
 */
export function createImapClient(config: ImapClientConfig): ImapClient {
  const state: ImapConnectionState = {
    conn: undefined,
    reader: undefined,
    writer: undefined,
    tagCounter: 0,
    buffer: "",
    decoder: new TextDecoder(),
    encoder: new TextEncoder(),
  };

  return {
    async connect(): Promise<void> {
      await establishImapConnection(state, config);
      await authenticateImapLogin(state, config);
    },
    async disconnect(): Promise<void> {
      await sendImapLogout(state);
      releaseImapResources(state);
    },
    fetchUnseen: () => fetchUnseenImapMessages(state),
  };
}

/**
 * Create a mock IMAP client for testing.
 *
 * Returns pre-configured messages without connecting to a real server.
 *
 * @param messages - Messages to return from fetchUnseen()
 * @returns An ImapClient mock
 */
export function createMockImapClient(
  messages: ImapMessage[] = [],
): ImapClient {
  let connected = false;
  let fetched = false;

  return {
    // deno-lint-ignore require-await
    async connect(): Promise<void> {
      connected = true;
    },

    // deno-lint-ignore require-await
    async disconnect(): Promise<void> {
      connected = false;
    },

    // deno-lint-ignore require-await
    async fetchUnseen(): Promise<readonly ImapMessage[]> {
      if (!connected) throw new Error("Not connected");
      if (fetched) return []; // Only return messages once (they get marked read)
      fetched = true;
      return messages;
    },
  };
}
