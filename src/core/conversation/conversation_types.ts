/**
 * Conversation persistence types — message records, store interface,
 * and retention configuration.
 *
 * Every conversation turn (user, assistant, tool_call, compaction_summary)
 * is persisted as a ConversationRecord. The MessageStore provides CRUD
 * operations and retention enforcement.
 *
 * @module
 */

import type { ClassificationLevel } from "../types/classification.ts";

/** Role of a conversation record. */
export type ConversationRole =
  | "user"
  | "assistant"
  | "tool_call"
  | "compaction_summary";

/** Immutable record of a single conversation turn. */
export interface ConversationRecord {
  readonly message_id: string;
  readonly session_id: string;
  readonly role: ConversationRole;
  readonly content: string;
  readonly classification: ClassificationLevel;
  readonly timestamp: string;
  readonly sequence: number;
  readonly lineage_id?: string;
  readonly tool_name?: string;
  readonly tool_args?: Record<string, unknown>;
  readonly compacted: boolean;
  readonly expiresAt?: string;
  readonly token_count?: number;
}

/** Input for appending a new conversation record. */
export interface ConversationAppendInput {
  readonly session_id: string;
  readonly role: ConversationRole;
  readonly content: string;
  readonly classification: ClassificationLevel;
  readonly lineage_id?: string;
  readonly tool_name?: string;
  readonly tool_args?: Record<string, unknown>;
  readonly token_count?: number;
}

/** Options for loading active (non-compacted, within resume window) records. */
export interface LoadActiveOptions {
  /** Maximum age in days for records to be considered active. Default: 7. */
  readonly resumeWindowDays?: number;
  /** Whether to exclude compacted records. Default: true. */
  readonly excludeCompacted?: boolean;
}

/** Configuration for message retention policies. */
export interface MessageRetentionConfig {
  /** Maximum age in days before a message record is deleted. Default: 30. */
  readonly maxAgeDays: number;
}

/** Store for persisting, querying, and managing conversation records. */
export interface MessageStore {
  /** Append a new conversation record. Assigns message_id, timestamp, and sequence. */
  append(input: ConversationAppendInput): Promise<ConversationRecord>;

  /** Load all records for a session (full audit trail, no filters). */
  loadSession(sessionId: string): Promise<ConversationRecord[]>;

  /**
   * Load active records for session restoration.
   * Filters by: not compacted, not expired, within resume window.
   */
  loadActive(
    sessionId: string,
    options?: LoadActiveOptions,
  ): Promise<ConversationRecord[]>;

  /** Mark records in a sequence range as compacted. */
  markCompacted(
    sessionId: string,
    fromSequence: number,
    toSequence: number,
  ): Promise<void>;

  /** Export all records for a session (alias for loadSession, compliance use). */
  export(sessionId: string): Promise<ConversationRecord[]>;

  /** Delete records older than maxAgeDays. Returns count of deleted records. */
  applyRetention(
    config: MessageRetentionConfig,
    now?: Date,
  ): Promise<import("../types/classification.ts").Result<number, string>>;
}
