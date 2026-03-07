/**
 * safeFetch — re-exported from core/security/safe_fetch.ts.
 *
 * The canonical implementation lives in core/ so modules
 * outside Layer 1 (e.g. cli/) can import safeFetch without violating
 * the dependency layer rules.
 *
 * @module
 */

export { safeFetch } from "../../core/security/safe_fetch.ts";
export type { SsrfChecker } from "../../core/security/safe_fetch.ts";
