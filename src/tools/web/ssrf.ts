/**
 * SSRF prevention — re-exported from core/security/ssrf.ts.
 *
 * The canonical implementation lives in core/security/ so that modules
 * outside Layer 1 (e.g. cli/) can import SSRF checks without violating
 * the dependency layer rules.
 *
 * @module
 */

export { checkIpListForSsrf, isPrivateIp, resolveAndCheck } from "../../core/security/ssrf.ts";
