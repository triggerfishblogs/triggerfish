/**
 * Conversation persistence type definitions.
 *
 * Defines the data model for persisted conversation records,
 * the MessageStore interface for CRUD operations, and retention
 * configuration for automatic cleanup.
 *
 * @module
 */

import type { ClassificationLevel, Result } from "../types/classification.ts";

/** Role of a conversation record in the session history. */
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

/** Options for loading active (non-compacted, non-expired) records. */
export interface LoadActiveOptions {
  readonly resumeWindowDays?: number;
  readonly excludeCompacted?: boolean;
}

/** Configuration for message retention policies. */
export interface MessageRetentionConfig {
  readonly maxAgeDays: number;
}

/** Store for persisting and retrieving conversation records. */
export interface MessageStore {
  /** Append a new conversation record, assigning message_id and sequence. */
  append(input: ConversationAppendInput): Promise<ConversationRecord>;

  /** Load all records for a session (no filters — full audit trail). */
  loadSession(sessionId: string): Promise<ConversationRecord[]>;

  /** Load active records for session restoration. Filters by resume window, compacted status, and expiry. */
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

  /** Export all records for a session (alias for loadSession). */
  export(sessionId: string): Promise<ConversationRecord[]>;

  /** Delete records older than maxAgeDays. Returns count of deleted records. */
  applyRetention(
    config: MessageRetentionConfig,
    now?: Date,
  ): Promise<Result<number, string>>;
}

/** Serialisable shape stored in the StorageProvider. */
export interface StoredConversationRecord {
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
