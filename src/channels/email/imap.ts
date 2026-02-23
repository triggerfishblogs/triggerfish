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

// ─── Mutable IMAP connection state ──────────────────────────────────────────

/** Mutable state for an IMAP connection, passed to module-level helpers. */
interface ImapConnectionState {
  conn: Deno.TlsConn | Deno.TcpConn | undefined;
  reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  tagCounter: number;
  buffer: string;
  readonly decoder: TextDecoder;
  readonly encoder: TextEncoder;
}

// ─── Low-level IMAP I/O ─────────────────────────────────────────────────────

/** Read a single CRLF-terminated line from the IMAP stream. */
async function readImapLine(s: ImapConnectionState): Promise<string> {
  while (!s.buffer.includes("\r\n")) {
    if (!s.reader) throw new Error("IMAP connection not established");
    const { value, done } = await s.reader.read();
    if (done) throw new Error("IMAP connection closed unexpectedly");
    s.buffer += s.decoder.decode(value);
  }
  const idx = s.buffer.indexOf("\r\n");
  const line = s.buffer.substring(0, idx);
  s.buffer = s.buffer.substring(idx + 2);
  return line;
}

/** Send a tagged IMAP command and collect response lines. */
async function sendImapCommand(
  s: ImapConnectionState,
  command: string,
): Promise<string[]> {
  if (!s.writer) throw new Error("IMAP connection not established");
  const tag = `A${++s.tagCounter}`;
  await s.writer.write(s.encoder.encode(`${tag} ${command}\r\n`));

  const lines: string[] = [];
  while (true) {
    const line = await readImapLine(s);
    lines.push(line);
    if (line.startsWith(`${tag} `)) break;
  }
  return lines;
}

// ─── Header parsing helpers ─────────────────────────────────────────────────

/** Parse the From address from IMAP header lines. */
function parseImapFrom(headerLines: string): string {
  const match = headerLines.match(/From:\s*(?:.*<)?([^>\s]+)>?/i);
  return match ? match[1] : "unknown";
}

/** Parse the Subject from IMAP header lines. */
function parseImapSubject(headerLines: string): string {
  const match = headerLines.match(/Subject:\s*(.+)/i);
  return match ? match[1].trim() : "(no subject)";
}

/** Parse the Date from IMAP header lines, falling back to now. */
function parseImapDate(headerLines: string): Date {
  const match = headerLines.match(/Date:\s*(.+)/i);
  if (match) {
    const d = new Date(match[1].trim());
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Extract the plain-text body from a combined FETCH response. */
function extractImapBodyText(combined: string): string {
  const bodyMatch = combined.match(
    /BODY\[TEXT\]\s*\{?\d*\}?\r?\n?([\s\S]*?)(?:\)\s*$|\*\s|A\d+)/,
  );
  return bodyMatch ? bodyMatch[1].trim() : "";
}

// ─── Connection lifecycle helpers ───────────────────────────────────────────

/** Open a TLS or TCP connection and populate the state. */
async function establishImapConnection(
  s: ImapConnectionState,
  config: ImapClientConfig,
): Promise<void> {
  const useTls = config.tls !== false;
  if (useTls) {
    s.conn = await Deno.connectTls({
      hostname: config.host,
      port: config.port,
    });
  } else {
    s.conn = await Deno.connect({
      hostname: config.host,
      port: config.port,
    });
  }
  s.reader = s.conn.readable.getReader();
  s.writer = s.conn.writable.getWriter();
}

/** Authenticate via IMAP LOGIN after the greeting line. */
async function authenticateImapLogin(
  s: ImapConnectionState,
  config: ImapClientConfig,
): Promise<void> {
  await readImapLine(s);
  const loginResult = await sendImapCommand(
    s,
    `LOGIN ${config.user} ${config.password}`,
  );
  const loginTag = loginResult[loginResult.length - 1];
  if (!loginTag.includes("OK")) {
    throw new Error("IMAP LOGIN failed");
  }
}

/** Send LOGOUT, ignoring errors if already disconnected. */
async function sendImapLogout(s: ImapConnectionState): Promise<void> {
  try {
    if (s.writer) await sendImapCommand(s, "LOGOUT");
  } catch (err: unknown) {
    log.debug("IMAP logout: connection already closed", { error: err });
  }
}

/** Release reader/writer/conn and reset buffer/counter. */
function releaseImapResources(s: ImapConnectionState): void {
  try {
    if (s.reader) {
      s.reader.releaseLock();
      s.reader = undefined;
    }
    if (s.writer) {
      s.writer.releaseLock();
      s.writer = undefined;
    }
    if (s.conn) {
      s.conn.close();
      s.conn = undefined;
    }
  } catch (err: unknown) {
    log.debug("IMAP cleanup: resource already released", { error: err });
  }
  s.buffer = "";
  s.tagCounter = 0;
}

// ─── IMAP mailbox operations ────────────────────────────────────────────────

/** SELECT INBOX on the IMAP server. */
async function selectImapInbox(s: ImapConnectionState): Promise<void> {
  const selectResult = await sendImapCommand(s, "SELECT INBOX");
  const selectTag = selectResult[selectResult.length - 1];
  if (!selectTag.includes("OK")) {
    throw new Error("IMAP SELECT INBOX failed");
  }
}

/** SEARCH UNSEEN and return the matching UIDs. */
async function searchUnseenImapUids(
  s: ImapConnectionState,
): Promise<readonly number[]> {
  const searchResult = await sendImapCommand(s, "SEARCH UNSEEN");
  const searchLine = searchResult.find((l) => l.startsWith("* SEARCH"));
  if (!searchLine || searchLine.trim() === "* SEARCH") return [];
  return searchLine
    .replace("* SEARCH ", "")
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((n) => !isNaN(n));
}

/** FETCH a single message by UID, returning a parsed ImapMessage. */
async function fetchImapMessageByUid(
  s: ImapConnectionState,
  uid: number,
): Promise<ImapMessage> {
  const fetchResult = await sendImapCommand(
    s,
    `FETCH ${uid} (BODY[HEADER.FIELDS (FROM SUBJECT DATE)] BODY[TEXT])`,
  );
  const combined = fetchResult.join("\n");
  return {
    uid,
    from: parseImapFrom(combined),
    subject: parseImapSubject(combined),
    body: extractImapBodyText(combined),
    date: parseImapDate(combined),
  };
}

/** STORE +FLAGS (\Seen) to mark a message as read. */
async function markImapMessageSeen(
  s: ImapConnectionState,
  uid: number,
): Promise<void> {
  await sendImapCommand(s, `STORE ${uid} +FLAGS (\\Seen)`);
}

/** Fetch all unseen messages, marking each as seen after retrieval. */
async function fetchUnseenImapMessages(
  s: ImapConnectionState,
): Promise<readonly ImapMessage[]> {
  await selectImapInbox(s);
  const uids = await searchUnseenImapUids(s);
  const messages: ImapMessage[] = [];
  for (const uid of uids) {
    try {
      const msg = await fetchImapMessageByUid(s, uid);
      messages.push(msg);
      await markImapMessageSeen(s, uid);
    } catch (err: unknown) {
      log.warn("IMAP message body fetch failed", { error: err, uid });
    }
  }
  return messages;
}

// ─── Factory ────────────────────────────────────────────────────────────────

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
