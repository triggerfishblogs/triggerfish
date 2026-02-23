/**
 * Gmail service types.
 *
 * Message, search, send, and label interfaces for the Gmail API.
 *
 * @module
 */

import type { GoogleApiResult } from "./types_auth.ts";

// ─── Gmail ───────────────────────────────────────────────────────────────────

/** A Gmail message with decoded body. */
export interface GmailMessage {
  readonly id: string;
  readonly threadId: string;
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly date: string;
  readonly snippet: string;
  readonly body: string;
  readonly labelIds: readonly string[];
}

/** Options for searching Gmail messages. */
export interface GmailSearchOptions {
  readonly query: string;
  readonly maxResults?: number;
}

/** Options for sending an email. */
export interface GmailSendOptions {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly cc?: string;
  readonly bcc?: string;
}

/** Options for labeling a message. */
export interface GmailLabelOptions {
  readonly messageId: string;
  readonly addLabelIds?: readonly string[];
  readonly removeLabelIds?: readonly string[];
}

/** Gmail service interface. */
export interface GmailService {
  readonly search: (
    options: GmailSearchOptions,
  ) => Promise<GoogleApiResult<readonly GmailMessage[]>>;
  readonly read: (messageId: string) => Promise<GoogleApiResult<GmailMessage>>;
  readonly send: (
    options: GmailSendOptions,
  ) => Promise<GoogleApiResult<{ readonly id: string }>>;
  readonly label: (
    options: GmailLabelOptions,
  ) => Promise<GoogleApiResult<{ readonly id: string }>>;
}
