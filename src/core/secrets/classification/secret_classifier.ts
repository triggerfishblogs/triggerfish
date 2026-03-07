/**
 * Secret path-to-classification mapper.
 *
 * Maps Vault paths to Triggerfish classification levels using
 * glob patterns defined in configuration. First match wins.
 *
 * @module
 */

import type { ClassificationLevel } from "../../types/classification.ts";

/** A single path-to-classification mapping rule. */
export interface ClassificationMapping {
  /** Glob pattern to match against the secret path. */
  readonly path: string;
  /** Classification level assigned when the pattern matches. */
  readonly level: ClassificationLevel;
}

/** Configuration for secret classification. */
export interface SecretClassifierConfig {
  /** Ordered list of path-to-level mappings. First match wins. */
  readonly mappings: readonly ClassificationMapping[];
  /** Fallback level when no mapping matches. Default: INTERNAL. */
  readonly defaultLevel: ClassificationLevel;
}

/**
 * Convert a simple glob pattern to a regex.
 *
 * Supports `*` (any chars except `/`) and `**` (any chars including `/`).
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\0")
    .replace(/\*/g, "[^/]*")
    .replace(/\0/g, ".*");
  return new RegExp(`^${escaped}$`);
}

/** A compiled classifier with cached regex patterns. */
export interface SecretClassifier {
  /** Classify a secret path. Returns the matched classification level. */
  readonly classifyPath: (path: string) => ClassificationLevel;
}

/**
 * Create a secret classifier from configuration.
 *
 * Compiles glob patterns once for efficient repeated matching.
 * First match wins — ordering in config matters.
 */
export function createSecretClassifier(
  config: SecretClassifierConfig,
): SecretClassifier {
  const compiled = config.mappings.map((mapping) => ({
    regex: globToRegex(mapping.path),
    level: mapping.level,
  }));

  return {
    classifyPath: (path: string): ClassificationLevel => {
      for (const { regex, level } of compiled) {
        if (regex.test(path)) {
          return level;
        }
      }
      return config.defaultLevel;
    },
  };
}
