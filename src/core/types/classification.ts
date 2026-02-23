/**
 * Classification system for data sensitivity levels.
 *
 * Implements a strict ordering where data can only flow to equal
 * or higher classification levels (no write-down rule).
 *
 * @module
 */

/** Result type for operations that can fail. */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Enterprise classification levels, ordered highest to lowest. */
export type ClassificationLevel =
  | "RESTRICTED"
  | "CONFIDENTIAL"
  | "INTERNAL"
  | "PUBLIC";

/** Numeric ordering for classification levels. Higher = more sensitive. */
export const CLASSIFICATION_ORDER: Record<ClassificationLevel, number> = {
  RESTRICTED: 4,
  CONFIDENTIAL: 3,
  INTERNAL: 2,
  PUBLIC: 1,
} as const;

/** Valid classification level strings for parsing. */
const VALID_LEVELS = new Set<string>([
  "RESTRICTED",
  "CONFIDENTIAL",
  "INTERNAL",
  "PUBLIC",
]);

/**
 * Compare two classification levels.
 *
 * @returns 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareClassification(
  a: ClassificationLevel,
  b: ClassificationLevel,
): -1 | 0 | 1 {
  const diff = CLASSIFICATION_ORDER[a] - CLASSIFICATION_ORDER[b];
  if (diff > 0) return 1;
  if (diff < 0) return -1;
  return 0;
}

/**
 * Check if data can flow from source to target classification.
 *
 * Enforces the no write-down rule: target must be >= source.
 * Data can only flow to equal or higher classification levels.
 */
export function canFlowTo(
  source: ClassificationLevel,
  target: ClassificationLevel,
): boolean {
  return CLASSIFICATION_ORDER[target] >= CLASSIFICATION_ORDER[source];
}

/**
 * Return the more restrictive of two classification levels.
 */
export function maxClassification(
  a: ClassificationLevel,
  b: ClassificationLevel,
): ClassificationLevel {
  return CLASSIFICATION_ORDER[a] >= CLASSIFICATION_ORDER[b] ? a : b;
}

/**
 * Return the less restrictive of two classification levels.
 * Used to enforce classification ceilings.
 */
export function minClassification(
  a: ClassificationLevel,
  b: ClassificationLevel,
): ClassificationLevel {
  return CLASSIFICATION_ORDER[a] <= CLASSIFICATION_ORDER[b] ? a : b;
}

/**
 * Parse a string into a ClassificationLevel.
 *
 * @returns Result with the parsed level or an error message
 */
export function parseClassification(
  input: string,
): Result<ClassificationLevel, string> {
  if (VALID_LEVELS.has(input)) {
    return { ok: true, value: input as ClassificationLevel };
  }
  return { ok: false, error: `Invalid classification level: "${input}"` };
}
