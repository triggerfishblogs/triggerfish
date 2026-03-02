/**
 * Audit chain — HMAC-based tamper-evident audit logging.
 *
 * @module
 */

export { createAuditChain, verifyAuditChain } from "./audit.ts";
export type { AuditChain, AuditEntry, ChainedAuditEntry } from "./audit.ts";

export {
  bufferToHex,
  canonicalize,
  computeHmac,
  GENESIS_HASH,
  importHmacKey,
} from "./audit_hmac.ts";
