/**
 * Domain security — single source of truth for SSRF prevention,
 * domain allowlist/denylist, and classification mappings.
 *
 * This module is imported by both `src/web/` and `src/browser/`.
 * Never duplicate domain security logic elsewhere.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("security");

// ─── SSRF Denylist (hardcoded, non-overridable) ─────────────────────────────

/** IPv4 CIDR ranges that are always blocked (private/reserved). */
const SSRF_DENY_CIDRS_V4: readonly {
  readonly addr: number;
  readonly mask: number;
}[] = [
  // 127.0.0.0/8 — loopback
  { addr: 0x7F000000, mask: 0xFF000000 },
  // 10.0.0.0/8 — private
  { addr: 0x0A000000, mask: 0xFF000000 },
  // 172.16.0.0/12 — private
  { addr: 0xAC100000, mask: 0xFFF00000 },
  // 192.168.0.0/16 — private
  { addr: 0xC0A80000, mask: 0xFFFF0000 },
  // 169.254.0.0/16 — link-local
  { addr: 0xA9FE0000, mask: 0xFFFF0000 },
  // 0.0.0.0/8 — "this" network
  { addr: 0x00000000, mask: 0xFF000000 },
];

/** Well-known private/reserved IPv6 addresses (checked as exact prefixes). */
const SSRF_DENY_V6_PREFIXES: readonly string[] = [
  "::1", // loopback
  "fc", // fc00::/7 — unique local (fc and fd)
  "fd",
  "fe80:", // fe80::/10 — link-local
];

/**
 * Parse an IPv4 address string to a 32-bit number.
 * Returns null if the string is not a valid IPv4 address.
 */
function parseIpv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    result = (result << 8) | n;
  }
  // Convert to unsigned 32-bit
  return result >>> 0;
}

/** Check if an IPv4 numeric address matches any denied CIDR range. */
function isPrivateIpv4(ipv4: number): boolean {
  for (const cidr of SSRF_DENY_CIDRS_V4) {
    if ((ipv4 & cidr.mask) === (cidr.addr & cidr.mask)) {
      return true;
    }
  }
  return false;
}

/** Check if a normalized IPv6 string matches any denied prefix. */
function isPrivateIpv6(normalized: string): boolean {
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") {
    return true;
  }
  for (const prefix of SSRF_DENY_V6_PREFIXES) {
    if (normalized.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Check if an IP address falls within the hardcoded SSRF denylist.
 *
 * Checks both IPv4 private/reserved ranges and IPv6 loopback/private prefixes.
 * This function is pure and deterministic.
 */
export function isPrivateIp(ip: string): boolean {
  const ipv4 = parseIpv4(ip);
  if (ipv4 !== null) return isPrivateIpv4(ipv4);
  const normalized = ip.toLowerCase();
  if (isPrivateIpv6(normalized)) return true;
  const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIp(v4Mapped[1]);
  return false;
}

/**
 * Resolve a hostname via DNS and check the resolved IP against the SSRF denylist.
 *
 * @returns Ok with the resolved IP, or Err with a reason string.
 */
export async function resolveAndCheck(
  hostname: string,
): Promise<Result<string, string>> {
  let addresses: Deno.NetAddr[];
  try {
    addresses = await Deno.resolveDns(
      hostname,
      "A",
    ) as unknown as Deno.NetAddr[];
  } catch (err) {
    return {
      ok: false,
      error: `DNS resolution failed for ${hostname}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (!Array.isArray(addresses) || addresses.length === 0) {
    return { ok: false, error: `No DNS records found for ${hostname}` };
  }

  // The Deno.resolveDns("A") returns string[] of IPs
  const ip = String(addresses[0]);

  if (isPrivateIp(ip)) {
    log.warn("SSRF blocked: hostname resolves to private IP", {
      hostname,
      resolvedIp: ip,
    });
    return {
      ok: false,
      error: `SSRF blocked: ${hostname} resolves to private IP ${ip}`,
    };
  }

  return { ok: true, value: ip };
}

// ─── Glob Pattern Matching ──────────────────────────────────────────────────

/**
 * Convert a domain glob pattern to a RegExp.
 *
 * Supports:
 * - `*` matches any single domain label (one or more non-dot chars)
 * - `*.example.com` matches `foo.example.com`, `bar.baz.example.com`
 * - Exact match: `example.com`
 */
function globToRegex(pattern: string): RegExp {
  // Leading *. means "any subdomain(s) of"
  if (pattern.startsWith("*.")) {
    const rest = pattern.slice(2).replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^(?:[^.]+\\.)*${rest}$`, "i");
  }

  // Escape all regex special chars, then replace unescaped * with [^.]+
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const withWild = escaped.replace(/\*/g, "[^.]+");
  return new RegExp(`^${withWild}$`, "i");
}

// ─── Domain Classification ──────────────────────────────────────────────────

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

// ─── Domain Classifier (for orchestrator resource classification) ────────────

export type {
  DomainClassificationResult,
  DomainClassifier,
} from "../../core/types/domain.ts";
import type {
  DomainClassificationResult,
  DomainClassifier,
} from "../../core/types/domain.ts";

/**
 * Create a domain classifier from a domain policy.
 *
 * Wraps the existing DomainPolicy.getClassification() to produce the same
 * output shape as PathClassifier.classify() — a classification level and
 * source string.
 */
export function createDomainClassifier(policy: DomainPolicy): DomainClassifier {
  return {
    classify(url: string): DomainClassificationResult {
      const classification = policy.getClassification(url);
      return { classification, source: "domain-policy" };
    },
  };
}

// ─── Legacy Compatibility (for browser module) ──────────────────────────────

/** Configuration shape compatible with the browser module's DomainPolicyConfig. */
export interface DomainPolicyConfig {
  /** Domains explicitly allowed for navigation. */
  readonly allowList: readonly string[];
  /** Domains explicitly denied for navigation. */
  readonly denyList: readonly string[];
  /** Per-domain classification assignments. */
  readonly classifications: Readonly<Record<string, string>>;
}

/**
 * Create a domain policy from the legacy DomainPolicyConfig shape.
 *
 * Converts the Record-based classifications to DomainClassification entries.
 * This is the backwards-compatible entry point used by `src/browser/domains.ts`.
 */
export function createDomainPolicyFromLegacy(
  config: DomainPolicyConfig,
): DomainPolicy {
  const classificationMap: DomainClassification[] = [];
  for (const [hostname, level] of Object.entries(config.classifications)) {
    classificationMap.push({
      pattern: hostname,
      classification: level as ClassificationLevel,
    });
  }

  return createDomainPolicy({
    allowlist: config.allowList,
    denylist: config.denyList,
    classificationMap,
  });
}
