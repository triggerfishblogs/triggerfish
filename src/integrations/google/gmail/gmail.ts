/**
 * Gmail service — search, read, send, and label operations.
 *
 * @module
 */

import type {
  GmailLabelOptions,
  GmailMessage,
  GmailSearchOptions,
  GmailSendOptions,
  GmailService,
  GoogleApiClient,
  GoogleApiResult,
} from "../types.ts";

/** Gmail API base URL. */
const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Raw Gmail API message shape. */
interface GmailApiMessage {
  readonly id: string;
  readonly threadId: string;
  readonly snippet: string;
  readonly labelIds?: readonly string[];
  readonly payload?: {
    readonly headers?: readonly {
      readonly name: string;
      readonly value: string;
    }[];
    readonly body?: { readonly data?: string };
    readonly parts?: readonly {
      readonly mimeType: string;
      readonly body?: { readonly data?: string };
    }[];
  };
}

/** Decode base64url-encoded string. */
function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

/** Extract a header value from Gmail message payload. */
function getHeader(
  headers:
    | readonly { readonly name: string; readonly value: string }[]
    | undefined,
  name: string,
): string {
  if (!headers) return "";
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return header?.value ?? "";
}

/** Extract body text from a Gmail message payload. */
function extractBody(msg: GmailApiMessage): string {
  // Try the direct body first
  if (msg.payload?.body?.data) {
    return decodeBase64Url(msg.payload.body.data);
  }
  // Try parts (multipart messages)
  if (msg.payload?.parts) {
    const textPart = msg.payload.parts.find(
      (p) => p.mimeType === "text/plain",
    );
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }
    // Fall back to HTML part
    const htmlPart = msg.payload.parts.find(
      (p) => p.mimeType === "text/html",
    );
    if (htmlPart?.body?.data) {
      return decodeBase64Url(htmlPart.body.data);
    }
  }
  return "";
}

/** Convert a raw API message to a GmailMessage. */
function toGmailMessage(msg: GmailApiMessage): GmailMessage {
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: getHeader(msg.payload?.headers, "From"),
    to: getHeader(msg.payload?.headers, "To"),
    subject: getHeader(msg.payload?.headers, "Subject"),
    date: getHeader(msg.payload?.headers, "Date"),
    snippet: msg.snippet,
    body: extractBody(msg),
    labelIds: msg.labelIds ?? [],
  };
}

/** Fetch full message details for a list of message IDs. */
async function fetchGmailMessageDetails(
  client: GoogleApiClient,
  messageIds: readonly { readonly id: string }[],
): Promise<readonly GmailMessage[]> {
  const messages: GmailMessage[] = [];
  for (const { id } of messageIds) {
    const msgResult = await client.get<GmailApiMessage>(
      `${GMAIL_BASE}/messages/${id}`,
      { format: "full" },
    );
    if (msgResult.ok) {
      messages.push(toGmailMessage(msgResult.value));
    }
  }
  return messages;
}

/** Search Gmail messages by query. */
async function searchGmailMessages(
  client: GoogleApiClient,
  options: GmailSearchOptions,
): Promise<GoogleApiResult<readonly GmailMessage[]>> {
  const params: Record<string, string> = {
    q: options.query,
    maxResults: String(options.maxResults ?? 10),
  };
  const listResult = await client.get<{
    readonly messages?: readonly { readonly id: string }[];
  }>(`${GMAIL_BASE}/messages`, params);
  if (!listResult.ok) return listResult;

  const messageIds = listResult.value.messages ?? [];
  if (messageIds.length === 0) return { ok: true, value: [] };

  const messages = await fetchGmailMessageDetails(client, messageIds);
  return { ok: true, value: messages };
}

/** Fetch and convert a single Gmail message. */
async function readGmailMessage(
  client: GoogleApiClient,
  messageId: string,
): Promise<GoogleApiResult<GmailMessage>> {
  const result = await client.get<GmailApiMessage>(
    `${GMAIL_BASE}/messages/${messageId}`,
    { format: "full" },
  );
  if (!result.ok) return result;
  return { ok: true, value: toGmailMessage(result.value) };
}

/** Build RFC 2822 headers for an outbound email. */
function buildRfc2822Headers(options: GmailSendOptions): readonly string[] {
  const headers = [
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
  ];
  if (options.cc) headers.push(`Cc: ${options.cc}`);
  if (options.bcc) headers.push(`Bcc: ${options.bcc}`);
  return headers;
}

/** Encode an RFC 2822 message as base64url for the Gmail API. */
function encodeGmailPayload(options: GmailSendOptions): string {
  const headers = buildRfc2822Headers(options);
  const rawMessage = headers.join("\r\n") + "\r\n\r\n" + options.body;
  return btoa(rawMessage)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Send a Gmail message. */
function sendGmailMessage(
  client: GoogleApiClient,
  options: GmailSendOptions,
): Promise<GoogleApiResult<{ readonly id: string }>> {
  const encoded = encodeGmailPayload(options);
  return client.post<{ readonly id: string }>(
    `${GMAIL_BASE}/messages/send`,
    { raw: encoded },
  );
}

/** Modify labels on a Gmail message. */
function modifyGmailLabels(
  client: GoogleApiClient,
  options: GmailLabelOptions,
): Promise<GoogleApiResult<{ readonly id: string }>> {
  return client.post<{ readonly id: string }>(
    `${GMAIL_BASE}/messages/${options.messageId}/modify`,
    {
      addLabelIds: options.addLabelIds ?? [],
      removeLabelIds: options.removeLabelIds ?? [],
    },
  );
}

/**
 * Create a Gmail service.
 *
 * @param client - Authenticated Google API client
 */
export function createGmailService(client: GoogleApiClient): GmailService {
  return {
    search: (options) => searchGmailMessages(client, options),
    read: (messageId) => readGmailMessage(client, messageId),
    send: (options) => sendGmailMessage(client, options),
    label: (options) => modifyGmailLabels(client, options),
  };
}
