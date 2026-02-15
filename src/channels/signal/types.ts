/**
 * Signal channel adapter types.
 *
 * Defines configuration, notification shapes, and JSON-RPC wire types
 * for communicating with signal-cli daemon.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../../core/types/classification.ts";

/** Configuration for the Signal channel adapter. */
export interface SignalConfig {
  /** signal-cli endpoint: "tcp://host:port" or "unix:///path/to/socket" */
  readonly endpoint: string;
  /** The Signal account phone number (E.164 format). */
  readonly account: string;
  /** Classification level for this channel. Default: PUBLIC */
  readonly classification?: ClassificationLevel;
  /** Owner's phone number for isOwner checks. */
  readonly ownerPhone?: string;
  /** Enable pairing mode — unpaired senders are silently dropped until they send a valid code. */
  readonly pairing?: boolean;
  /** Classification level assigned to paired users. Default: INTERNAL. */
  readonly pairing_classification?: ClassificationLevel;
  /** Per-user classification overrides. Users listed here get tool access up to their ceiling. */
  readonly user_classifications?: Readonly<Record<string, string>>;
  /** Default group mode. */
  readonly defaultGroupMode?: "always" | "mentioned-only" | "owner-only";
  /** Group chat configuration. */
  readonly groups?: Readonly<Record<string, SignalGroupConfig>>;
  /** Injected signal-cli client for testing. */
  readonly _client?: SignalClientInterface;
}

/** Per-group Signal configuration. */
export interface SignalGroupConfig {
  readonly mode: "always" | "mentioned-only" | "owner-only";
  readonly classification?: ClassificationLevel;
}

/** Group info from a Signal notification envelope. */
export interface SignalGroupInfo {
  readonly groupId: string;
  readonly type?: string;
}

/** Mention data from a Signal notification. */
export interface SignalMention {
  readonly start: number;
  readonly length: number;
  readonly uuid: string;
}

/** Attachment metadata from a Signal notification. */
export interface SignalAttachmentMeta {
  readonly contentType: string;
  readonly size: number;
  readonly filename?: string;
  readonly localPath?: string;
}

/** Data message payload from a signal-cli notification envelope. */
export interface SignalDataMessage {
  readonly message: string | null;
  readonly timestamp: number;
  readonly groupInfo?: SignalGroupInfo | null;
  readonly mentions?: readonly SignalMention[];
  readonly attachments?: readonly SignalAttachmentMeta[];
}

/** Signal notification envelope from signal-cli. */
export interface SignalEnvelope {
  readonly source: string;
  readonly sourceDevice: number;
  readonly timestamp: number;
  readonly dataMessage?: SignalDataMessage | null;
}

/** Parsed signal-cli notification. */
export interface SignalNotification {
  readonly envelope: SignalEnvelope;
}

/** JSON-RPC 2.0 request. */
export interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly params?: Readonly<Record<string, unknown>>;
  readonly id: string;
}

/** JSON-RPC 2.0 success response. */
export interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly result?: unknown;
  readonly error?: JsonRpcError;
  readonly id: string;
}

/** JSON-RPC 2.0 error object. */
export interface JsonRpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

/** JSON-RPC 2.0 notification (no id field). */
export interface JsonRpcNotification {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

/** Interface for signal-cli JSON-RPC client (used for dependency injection in tests). */
export interface SignalClientInterface {
  /** Connect to signal-cli daemon. */
  connect(): Promise<Result<void, string>>;
  /** Disconnect from signal-cli daemon. */
  disconnect(): Promise<void>;
  /** Send a text message to a recipient phone number. */
  sendMessage(recipient: string, message: string): Promise<Result<{ readonly timestamp: number }, string>>;
  /** Send a text message to a group. */
  sendGroupMessage(groupId: string, message: string): Promise<Result<{ readonly timestamp: number }, string>>;
  /** Send typing indicator to a recipient. */
  sendTyping(recipient: string): Promise<Result<void, string>>;
  /** Stop typing indicator to a recipient. */
  sendTypingStop(recipient: string): Promise<Result<void, string>>;
  /** Register a handler for incoming notifications. */
  onNotification(handler: (notification: SignalNotification) => void): void;
  /** Ping signal-cli to verify connectivity. */
  ping(): Promise<Result<void, string>>;
  /** List all known Signal groups. */
  listGroups(): Promise<Result<readonly SignalGroupEntry[], string>>;
  /** List all known Signal contacts. */
  listContacts(): Promise<Result<readonly SignalContactEntry[], string>>;
}

/** A Signal group as returned by signal-cli listGroups. */
export interface SignalGroupEntry {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly isMember: boolean;
  readonly isBlocked: boolean;
  readonly members?: readonly string[];
}

/** A Signal contact as returned by signal-cli listContacts. */
export interface SignalContactEntry {
  readonly number: string;
  readonly name?: string;
  readonly profileName?: string;
  readonly isBlocked: boolean;
}
