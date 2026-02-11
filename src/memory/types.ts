/**
 * Memory system types — cross-session recall with classification gating.
 *
 * Every memory record carries classification metadata that controls
 * visibility. The LLM never chooses classification — it is forced to
 * the session taint level on every write.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import type { SessionId } from "../core/types/session.ts";

/** A memory record as seen by application code (rich Date objects). */
export interface MemoryRecord {
  readonly key: string;
  readonly agentId: string;
  readonly classification: ClassificationLevel;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt?: Date;
  readonly expired: boolean;
  readonly sourceSessionId: SessionId;
  readonly lineageId?: string;
}

/** Serialisable shape stored in the StorageProvider (ISO strings, plain string IDs). */
export interface StoredMemoryRecord {
  readonly key: string;
  readonly agentId: string;
  readonly classification: ClassificationLevel;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
  readonly expired: boolean;
  readonly sourceSessionId: string;
  readonly lineageId?: string;
}

/** Errors that can occur during memory operations. */
export type MemoryError =
  | { readonly code: "NOT_FOUND"; readonly message: string }
  | { readonly code: "CLASSIFICATION_VIOLATION"; readonly message: string }
  | { readonly code: "STORAGE_ERROR"; readonly message: string }
  | { readonly code: "VALIDATION_ERROR"; readonly message: string };
