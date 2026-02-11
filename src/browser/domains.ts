/**
 * Domain classification policy for browser automation.
 *
 * Re-exports from `src/web/domains.ts` — the single source of truth
 * for domain security, SSRF prevention, and classification mappings.
 *
 * @module
 */

export type { DomainPolicy, DomainPolicyConfig } from "../web/domains.ts";
export { createDomainPolicyFromLegacy as createDomainPolicy } from "../web/domains.ts";
