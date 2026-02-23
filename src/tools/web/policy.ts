/**
 * Domain security policy — allowlist, denylist, and classification mapping.
 *
 * Provides the DomainPolicy interface for checking URLs against
 * domain-level security rules. This is the primary API for domain
 * access control.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { globToRegex } from "./glob.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

/** A mapping from a domain glob pattern to a classification floor. */
export interface DomainClassification {
  readonly pattern: string;
  readonly classification: ClassificationLevel;
}

/** Configuration for domain security policy. */
export interface DomainSecurityConfig {
  /** Domain glob patterns explicitly allowed. Empty = allow all (minus denylist). */
  readonly allowlist: readonly string[];
  /** Domain glob patterns explicitly denied. Always checked. */
  readonly denylist: readonly string[];
  /** Per-domain classification floor mappings. */
  readonly classificationMap: readonly DomainClassification[];
}

/** Domain policy interface for checking URLs against security rules. */
export interface DomainPolicy {
  /** Check if a URL's hostname is allowed (not on denylist, passes allowlist). */
  isAllowed(url: string): boolean;
  /** Get the classification floor for a URL's domain. Returns PUBLIC if unclassified. */
  getClassification(url: string): ClassificationLevel;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
 * Check if a hostname matches any pattern in a list of glob patterns.
 */
function matchesAny(hostname: string, patterns: readonly string[]): boolean {
  for (const pattern of patterns) {
    if (globToRegex(pattern).test(hostname)) {
      return true;
    }
  }
  return false;
}

/** Determine if a hostname passes the denylist/allowlist checks. */
function evaluateDomainAllowance(
  hostname: string,
  config: DomainSecurityConfig,
): boolean {
  if (matchesAny(hostname, config.denylist)) return false;
  if (config.allowlist.length > 0) {
    return matchesAny(hostname, config.allowlist);
  }
  return true;
}

/** Resolve the classification level for a hostname from the classification map. */
function resolveDomainClassification(
  hostname: string,
  classificationMap: readonly DomainClassification[],
): ClassificationLevel {
  for (const entry of classificationMap) {
    if (globToRegex(entry.pattern).test(hostname)) {
      return entry.classification;
    }
  }
  return "PUBLIC";
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a domain security policy.
 *
 * @param config - Security configuration with allowlist, denylist, and classification mappings
 * @returns A DomainPolicy for checking URLs
 */
export function createDomainPolicy(config: DomainSecurityConfig): DomainPolicy {
  return {
    isAllowed(url: string): boolean {
      const hostname = extractHostname(url);
      if (hostname === null) return false;
      return evaluateDomainAllowance(hostname, config);
    },
    getClassification(url: string): ClassificationLevel {
      const hostname = extractHostname(url);
      if (hostname === null) return "PUBLIC";
      return resolveDomainClassification(hostname, config.classificationMap);
    },
  };
}
