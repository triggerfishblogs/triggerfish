/**
 * Session module — session lifecycle, taint propagation, lineage, and management.
 *
 * @module
 */

export type { SessionManager } from "./manager.ts";
export { createSessionManager } from "./manager.ts";
export { propagateTaint } from "./taint.ts";

export type {
  LineageClassification,
  LineageCreateInput,
  LineageLocation,
  LineageOrigin,
  LineageRecord,
  LineageStore,
  LineageTransformation,
} from "./lineage.ts";
export { createLineageStore } from "./lineage.ts";
