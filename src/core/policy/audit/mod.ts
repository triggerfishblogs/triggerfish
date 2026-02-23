/**
 * Audit chain — HMAC-based tamper-evident audit logging.
 *
 * @module
 */

export { createAuditChain, verifyAuditChain } from "./audit.ts";
export type {
  AuditEntry,
  ChainedAuditEntry,
  AuditChain,
} from "./audit.ts";

export {
  GENESIS_HASH,
  importHmacKey,
  canonicalize,
  bufferToHex,
  computeHmac,
} from "./audit_hmac.ts";
