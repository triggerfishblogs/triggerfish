/**
 * Data lineage type definitions — provenance metadata interfaces for all
 * data flowing through the system.
 *
 * Every data element carries origin, classification, transformations, and
 * current location. The lineage graph supports forward trace (what happened
 * to this data?) and backward trace (what sources contributed?).
 *
 * @module
 */

import type { ClassificationLevel } from "../types/classification.ts";
import type { SessionId } from "../types/session.ts";

/** Origin metadata describing where data came from. */
export interface LineageOrigin {
  readonly source_type: string;
  readonly source_name: string;
  readonly accessed_at: string;
  readonly accessed_by: string;
  readonly access_method: string;
}

/** Classification metadata attached to a lineage record. */
export interface LineageClassification {
  readonly level: ClassificationLevel;
  readonly reason: string;
}

/** A transformation applied to data. */
export interface LineageTransformation {
  readonly type: string;
  readonly description: string;
  readonly timestamp: Date;
  readonly agent_id?: string;
  readonly input_lineage_ids?: readonly string[];
}

/** Current location of data in the system. */
export interface LineageLocation {
  readonly session_id: string;
  readonly context_position: string;
}

/** Immutable record tracking provenance of a piece of data. */
export interface LineageRecord {
  readonly lineage_id: string;
  readonly content_hash: string;
  readonly origin: LineageOrigin;
  readonly classification: LineageClassification;
  readonly sessionId: SessionId;
  readonly inputLineageIds?: readonly string[];
  readonly transformations?: readonly LineageTransformation[];
  readonly current_location?: LineageLocation;
  /** Content stored only when classification.level === "PUBLIC". */
  readonly content?: string;
}

/** Input for creating a new lineage record. */
export interface LineageCreateInput {
  readonly content: string;
  readonly origin: LineageOrigin;
  readonly classification: LineageClassification;
  readonly sessionId: SessionId;
  readonly inputLineageIds?: readonly string[];
  readonly transformations?: readonly LineageTransformation[];
  readonly current_location?: LineageLocation;
}

/** Store for creating, querying, and tracing data lineage records. */
export interface LineageStore {
  /** Create a new lineage record. Computes content_hash and generates lineage_id. */
  create(input: LineageCreateInput): Promise<LineageRecord>;

  /** Retrieve a record by its lineage_id. Returns null if not found. */
  get(id: string): Promise<LineageRecord | null>;

  /** Get all lineage records associated with a session. */
  getBySession(sessionId: SessionId): Promise<LineageRecord[]>;

  /** Forward trace: find all records that were derived from this record. */
  trace_forward(id: string): Promise<LineageRecord[]>;

  /**
   * Forward trace using reverse index — O(k) where k = number of children.
   * Preferred over trace_forward() which scans all records.
   */
  trace_forward_indexed(id: string): Promise<LineageRecord[]>;

  /** Backward trace: find all source records that contributed to this record. */
  trace_backward(id: string): Promise<LineageRecord[]>;

  /**
   * Retrieve content by its SHA-256 hash, gated by classification.
   * Returns content only when `canFlowTo(record.classification.level, taint)` passes
   * and the record has stored content (PUBLIC classification only).
   */
  getByHash(
    hash: string,
    taint: ClassificationLevel,
  ): Promise<{ content: string; record: LineageRecord } | null>;

  /** Export the full lineage chain for a session (compliance). */
  export(sessionId: SessionId): Promise<LineageRecord[]>;

  /** Delete lineage records older than maxAgeDays. */
  applyLineageRetention(config: {
    readonly maxAgeDays: number;
  }, now?: Date): Promise<import("../types/classification.ts").Result<number, string>>;
}

/** Stored shape for a single transformation (timestamp as ISO string). */
export interface StoredTransformation {
  readonly type: string;
  readonly description: string;
  readonly timestamp: string;
  readonly agent_id?: string;
  readonly input_lineage_ids?: readonly string[];
}

/** Serialisable shape stored in the StorageProvider. */
export interface StoredLineageRecord {
  readonly lineage_id: string;
  readonly content_hash: string;
  readonly origin: LineageOrigin;
  readonly classification: LineageClassification;
  readonly sessionId: string;
  readonly inputLineageIds?: readonly string[];
  readonly transformations?: readonly StoredTransformation[];
  readonly current_location?: LineageLocation;
  /** Content stored only when classification.level === "PUBLIC". */
  readonly content?: string;
}
