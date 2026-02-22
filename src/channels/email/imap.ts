/**
 * Minimal IMAP client for receiving emails.
 *
 * Connects to an IMAP server via TLS, fetches unseen messages,
 * and marks them as read. Uses Deno's built-in TLS connection.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("email");

/** A parsed email message from IMAP. */
export interface ImapMessage {
  /** Server-assigned message UID. */
  readonly uid: number;
  /** Sender email address. */
  readonly from: string;
  /** Email subject line. */
  readonly subject: string;
  /** Plain text body content. */
  readonly body: string;
  /** Date the email was sent. */
  readonly date: Date;
}

/** Configuration for the IMAP client. */
export interface ImapClientConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  /** Use TLS (default: true). */
  readonly tls?: boolean;
}

/** IMAP client interface for fetching emails. */
export interface ImapClient {
  /** Connect and authenticate to the IMAP server. */
  connect(): Promise<void>;
  /** Disconnect from the server. */
  disconnect(): Promise<void>;
  /** Fetch all unseen messages from INBOX and mark them as seen. */
  fetchUnseen(): Promise<readonly ImapMessage[]>;
}

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
  let conn: Deno.TlsConn | Deno.TcpConn | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  let tagCounter = 0;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  async function readLine(): Promise<string> {
    while (!buffer.includes("\r\n")) {
      if (!reader) throw new Error("Not connected");
      const { value, done } = await reader.read();
      if (done) throw new Error("Connection closed");
      buffer += decoder.decode(value);
    }
    const idx = buffer.indexOf("\r\n");
    const line = buffer.substring(0, idx);
    buffer = buffer.substring(idx + 2);
    return line;
  }

  async function sendCommand(command: string): Promise<string[]> {
    if (!writer) throw new Error("Not connected");
    const tag = `A${++tagCounter}`;
    await writer.write(encoder.encode(`${tag} ${command}\r\n`));

    const lines: string[] = [];
    while (true) {
      const line = await readLine();
      if (line.startsWith(`${tag} `)) {
        lines.push(line);
        break;
      }
      lines.push(line);
    }
    return lines;
  }

  function parseFrom(headerLines: string): string {
    const match = headerLines.match(/From:\s*(?:.*<)?([^>\s]+)>?/i);
    return match ? match[1] : "unknown";
  }

  function parseSubject(headerLines: string): string {
    const match = headerLines.match(/Subject:\s*(.+)/i);
    return match ? match[1].trim() : "(no subject)";
  }

  function parseDate(headerLines: string): Date {
    const match = headerLines.match(/Date:\s*(.+)/i);
    if (match) {
      const d = new Date(match[1].trim());
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  return {
    async connect(): Promise<void> {
      const useTls = config.tls !== false;

      if (useTls) {
        conn = await Deno.connectTls({
          hostname: config.host,
          port: config.port,
        });
      } else {
        conn = await Deno.connect({
          hostname: config.host,
          port: config.port,
        });
      }

      reader = conn.readable.getReader();
      writer = conn.writable.getWriter();

      // Read server greeting
      await readLine();

      // Login
      const loginResult = await sendCommand(
        `LOGIN ${config.user} ${config.password}`,
      );
      const loginTag = loginResult[loginResult.length - 1];
      if (!loginTag.includes("OK")) {
        throw new Error("IMAP LOGIN failed");
      }
    },

    async disconnect(): Promise<void> {
      try {
        if (writer) {
          await sendCommand("LOGOUT");
        }
      } catch (err: unknown) {
        log.debug("IMAP logout: connection already closed", { error: err });
      }

      try {
        if (reader) {
          reader.releaseLock();
          reader = undefined;
        }
        if (writer) {
          writer.releaseLock();
          writer = undefined;
        }
        if (conn) {
          conn.close();
          conn = undefined;
        }
      } catch (err: unknown) {
        log.debug("IMAP cleanup: resource already released", { error: err });
      }
      buffer = "";
      tagCounter = 0;
    },

    async fetchUnseen(): Promise<readonly ImapMessage[]> {
      // SELECT INBOX
      const selectResult = await sendCommand("SELECT INBOX");
      const selectTag = selectResult[selectResult.length - 1];
      if (!selectTag.includes("OK")) {
        throw new Error("IMAP SELECT INBOX failed");
      }

      // SEARCH UNSEEN
      const searchResult = await sendCommand("SEARCH UNSEEN");
      const messages: ImapMessage[] = [];

      // Parse UIDs from search result (line starts with "* SEARCH")
      const searchLine = searchResult.find((l) => l.startsWith("* SEARCH"));
      if (!searchLine || searchLine.trim() === "* SEARCH") {
        return messages; // No unseen messages
      }

      const uids = searchLine
        .replace("* SEARCH ", "")
        .trim()
        .split(/\s+/)
        .map(Number)
        .filter((n) => !isNaN(n));

      // Fetch each message
      for (const uid of uids) {
        try {
          const fetchResult = await sendCommand(
            `FETCH ${uid} (BODY[HEADER.FIELDS (FROM SUBJECT DATE)] BODY[TEXT])`,
          );

          // Combine all response lines into one string for parsing
          const combined = fetchResult.join("\n");
          const from = parseFrom(combined);
          const subject = parseSubject(combined);
          const date = parseDate(combined);

          // Extract body text (everything after the header section)
          const bodyMatch = combined.match(
            /BODY\[TEXT\]\s*\{?\d*\}?\r?\n?([\s\S]*?)(?:\)\s*$|\*\s|A\d+)/,
          );
          const body = bodyMatch ? bodyMatch[1].trim() : "";

          messages.push({ uid, from, subject, body, date });

          // Mark as seen
          await sendCommand(`STORE ${uid} +FLAGS (\\Seen)`);
        } catch (err: unknown) {
          log.warn("IMAP message body fetch failed", { error: err, uid });
        }
      }

      return messages;
    },
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
