/**
 * SSRF prevention — re-exported from core/security/ssrf.ts.
 *
 * The canonical implementation lives in core/ so modules
 * outside Layer 1 can import SSRF utilities without violating
 * the dependency layer rules.
 *
 * @module
 */

export {
  checkIpListForSsrf,
  isPrivateIp,
  resolveAndCheck,
} from "../../core/security/ssrf.ts";
