/**
 * IMAP protocol operations.
 *
 * Low-level I/O (read/send commands), connection lifecycle
 * (establish, authenticate, logout, cleanup), and mailbox
 * operations (select, search, fetch, mark-seen).
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type {
  ImapClientConfig,
  ImapConnectionState,
  ImapMessage,
} from "./imap_types.ts";
import {
  extractImapBodyText,
  parseImapDate,
  parseImapFrom,
  parseImapSubject,
} from "./imap_parsers.ts";

const log = createLogger("email");

// ─── Low-level IMAP I/O ─────────────────────────────────────────────────────

/** Read a single CRLF-terminated line from the IMAP stream. */
export async function readImapLine(
  s: ImapConnectionState,
): Promise<string> {
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
export async function sendImapCommand(
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

// ─── Connection lifecycle ───────────────────────────────────────────────────

/** Open a TLS or TCP connection and populate the state. */
export async function establishImapConnection(
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
export async function authenticateImapLogin(
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
export async function sendImapLogout(
  s: ImapConnectionState,
): Promise<void> {
  try {
    if (s.writer) await sendImapCommand(s, "LOGOUT");
  } catch (err: unknown) {
    log.debug("IMAP logout: connection already closed", { error: err });
  }
}

/** Release reader/writer/conn and reset buffer/counter. */
export function releaseImapResources(s: ImapConnectionState): void {
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

// ─── Mailbox operations ─────────────────────────────────────────────────────

/** SELECT INBOX on the IMAP server. */
export async function selectImapInbox(
  s: ImapConnectionState,
): Promise<void> {
  const selectResult = await sendImapCommand(s, "SELECT INBOX");
  const selectTag = selectResult[selectResult.length - 1];
  if (!selectTag.includes("OK")) {
    throw new Error("IMAP SELECT INBOX failed");
  }
}

/** SEARCH UNSEEN and return the matching UIDs. */
export async function searchUnseenImapUids(
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
export async function fetchImapMessageByUid(
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
export async function markImapMessageSeen(
  s: ImapConnectionState,
  uid: number,
): Promise<void> {
  await sendImapCommand(s, `STORE ${uid} +FLAGS (\\Seen)`);
}

/** Fetch all unseen messages, marking each as seen after retrieval. */
export async function fetchUnseenImapMessages(
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
