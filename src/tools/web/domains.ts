/**
 * Domain security — single source of truth for SSRF prevention,
 * domain allowlist/denylist, and classification mappings.
 *
 * This module re-exports from the split files for backwards compatibility.
 * Both this module and `src/tools/browser/` import from these files.
 * Never duplicate domain security logic elsewhere.
 *
 * @module
 */

export { isPrivateIp, resolveAndCheck } from "./ssrf.ts";
export {
  createDomainPolicy,
  type DomainClassification,
  type DomainPolicy,
  type DomainSecurityConfig,
} from "./policy.ts";
export {
  createDomainClassifier,
  createDomainPolicyFromLegacy,
  type DomainClassificationResult,
  type DomainClassifier,
  type DomainPolicyConfig,
} from "./classifier.ts";
