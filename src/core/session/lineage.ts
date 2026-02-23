/**
 * Data lineage tracking — re-exports from split modules.
 *
 * Types and interfaces live in {@link ./lineage_types.ts},
 * serialisation helpers in {@link ./lineage_serde.ts},
 * and the store implementation in {@link ./lineage_store.ts}.
 *
 * @module
 */

export type {
  LineageClassification,
  LineageCreateInput,
  LineageLocation,
  LineageOrigin,
  LineageRecord,
  LineageStore,
  LineageTransformation,
} from "./lineage_types.ts";

export { createLineageStore } from "./lineage_store.ts";
