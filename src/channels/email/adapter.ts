/**
 * Email channel adapter via SMTP/IMAP.
 *
 * Sends replies via SMTP relay API and receives incoming messages
 * via IMAP polling. Uses the ImapClient abstraction for receive,
 * which can be swapped with a mock for testing.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "../types.ts";
import type { ImapClient } from "./imap.ts";
import { createImapClient } from "./imap.ts";

/** Configuration for the Email channel adapter. */
export interface EmailConfig {
  /** SMTP relay API endpoint (e.g. SendGrid, Mailgun). */
  readonly smtpApiUrl: string;
  /** API key for the SMTP relay service. */
  readonly smtpApiKey: string;
  /** IMAP server hostname for receiving. */
  readonly imapHost: string;
  /** IMAP server port. Default: 993 */
  readonly imapPort?: number;
  /** IMAP username (usually email address). */
  readonly imapUser: string;
  /** IMAP password or app-specific password. */
  readonly imapPassword: string;
  /** From address for outgoing emails. */
  readonly fromAddress: string;
  /** Poll interval in ms for checking new emails. Default: 30000 */
  readonly pollInterval?: number;
  /** Classification level for this channel. Default: CONFIDENTIAL */
  readonly classification?: ClassificationLevel;
  /** Owner's email address for isOwner checks. */
  readonly ownerEmail?: string;
  /** Injected IMAP client for testing. If not provided, a real client is created. */
  readonly _imapClient?: ImapClient;
}

/**
 * Create an Email channel adapter.
 *
 * Sends via SMTP relay HTTP API and receives via IMAP polling.
 * Each email thread is mapped to a session ID based on the sender address.
 *
 * @param config - Email configuration.
 * @returns A ChannelAdapter wired to email.
 */
export function createEmailChannel(config: EmailConfig): ChannelAdapter {
  const log = createLogger("email");
  const classification = (config.classification ?? "CONFIDENTIAL") as ClassificationLevel;
  const pollInterval = config.pollInterval ?? 30000;
  let connected = false;
  let handler: MessageHandler | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const imapClient: ImapClient = config._imapClient ?? createImapClient({
    host: config.imapHost,
    port: config.imapPort ?? 993,
    user: config.imapUser,
    password: config.imapPassword,
    tls: true,
  });

  return {
    classification,
    isOwner: true,

    async connect(): Promise<void> {
      // Connect IMAP client
      await imapClient.connect();

      // Start polling for new emails
      pollTimer = setInterval(async () => {
        await pollEmails();
      }, pollInterval);

      // Do initial poll
      await pollEmails();
      connected = true;
      log.info("Email adapter connected", { imapHost: config.imapHost });
    },

    async disconnect(): Promise<void> {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      await imapClient.disconnect();
      connected = false;
      log.info("Email adapter disconnected");
    },

    async send(message: ChannelMessage): Promise<void> {
      if (!message.sessionId) return;

      const toAddress = message.sessionId.replace("email-", "");

      const response = await fetch(config.smtpApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.smtpApiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toAddress }] }],
          from: { email: config.fromAddress },
          subject: "Triggerfish",
          content: [{ type: "text/plain", value: message.content }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Email send failed (${response.status}): ${err}`);
      }
    },

    onMessage(msgHandler: MessageHandler): void {
      handler = msgHandler;
    },

    status(): ChannelStatus {
      return {
        connected,
        channelType: "email",
      };
    },
  };

  /** Poll IMAP for unseen emails and dispatch to handler. */
  async function pollEmails(): Promise<void> {
    if (!handler) return;

    try {
      const messages = await imapClient.fetchUnseen();

      for (const msg of messages) {
        const sessionId = `email-${msg.from}`;
        const isOwner = config.ownerEmail !== undefined
          ? msg.from === config.ownerEmail
          : true;

        log.debug("Email received", { from: msg.from, subject: msg.subject, isOwner });
        handler({
          content: msg.body || msg.subject,
          sessionId,
          senderId: msg.from,
          isOwner,
          sessionTaint: isOwner ? undefined : ("PUBLIC" as ClassificationLevel),
        });
      }
    } catch (err: unknown) {
      log.warn("IMAP unseen email poll failed", { error: err });
    }
  }
}
