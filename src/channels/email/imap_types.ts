/**
 * IMAP client types and interfaces.
 *
 * Defines the message shape, client configuration, and client interface
 * for the minimal IMAP implementation.
 *
 * @module
 */

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

/** Mutable state for an IMAP connection, passed to module-level helpers. */
export interface ImapConnectionState {
  conn: Deno.TlsConn | Deno.TcpConn | undefined;
  reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  tagCounter: number;
  buffer: string;
  readonly decoder: TextDecoder;
  readonly encoder: TextEncoder;
}
