/**
 * Domain classifier — wraps DomainPolicy for orchestrator resource classification,
 * plus legacy compatibility for the browser module.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  DomainClassification,
  DomainPolicy,
  DomainSecurityConfig,
} from "./policy.ts";
import { createDomainPolicy } from "./policy.ts";

// ─── Domain Classifier ─────────────────────────────────────────────────────

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
 * This is the backwards-compatible entry point used by `src/tools/browser/domains.ts`.
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
