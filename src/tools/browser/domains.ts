/**
 * Domain classification policy for browser automation.
 *
 * Re-exports from `src/tools/web/` — the single source of truth
 * for domain security, SSRF prevention, and classification mappings.
 *
 * @module
 */

export type { DomainPolicy } from "../web/policy.ts";
export type { DomainPolicyConfig } from "../web/classifier.ts";
export { createDomainPolicyFromLegacy as createDomainPolicy } from "../web/classifier.ts";
