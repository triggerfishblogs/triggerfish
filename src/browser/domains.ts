/**
 * Domain classification policy for browser automation.
 *
 * Manages domain allowlists, denylists, and per-domain classification
 * assignments. Navigation to a classified domain escalates session taint.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";

/** Configuration for domain classification policy. */
export interface DomainPolicyConfig {
  /** Domains explicitly allowed for navigation. */
  readonly allowList: readonly string[];
  /** Domains explicitly denied for navigation. */
  readonly denyList: readonly string[];
  /** Per-domain classification assignments. */
  readonly classifications: Readonly<Record<string, string>>;
}

/** Domain classification policy interface. */
export interface DomainPolicy {
  /** Check if a URL is allowed for navigation. */
  isAllowed(url: string): boolean;
  /** Get the classification level for a URL's domain. Returns PUBLIC if unclassified. */
  getClassification(url: string): ClassificationLevel;
}

/**
 * Extract the hostname from a URL string.
 *
 * @returns The hostname, or null if the URL is invalid.
 */
function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Create a domain classification policy.
 *
 * @param config - Policy configuration with allow/deny lists and classifications
 * @returns A DomainPolicy instance for checking URLs
 */
export function createDomainPolicy(config: DomainPolicyConfig): DomainPolicy {
  const allowSet = new Set(config.allowList);
  const denySet = new Set(config.denyList);

  return {
    isAllowed(url: string): boolean {
      const hostname = extractHostname(url);
      if (hostname === null) {
        return false;
      }
      if (denySet.has(hostname)) {
        return false;
      }
      if (allowSet.size > 0) {
        return allowSet.has(hostname);
      }
      return true;
    },

    getClassification(url: string): ClassificationLevel {
      const hostname = extractHostname(url);
      if (hostname === null) {
        return "PUBLIC";
      }
      const level = config.classifications[hostname];
      if (level !== undefined) {
        return level as ClassificationLevel;
      }
      return "PUBLIC";
    },
  };
}
