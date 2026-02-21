/**
 * Domain classifier types for URL-based classification.
 *
 * Extracted into core so that agent/ and tools/ can both depend on
 * these types without circular imports.
 *
 * @module
 */

import type { ClassificationLevel } from "./classification.ts";

/** Result of classifying a URL's domain. */
export interface DomainClassificationResult {
  readonly classification: ClassificationLevel;
  readonly source: string;
}

/** Classifier that resolves a URL to a classification level. Mirrors PathClassifier. */
export interface DomainClassifier {
  /** Classify a URL by its domain. */
  classify(url: string): DomainClassificationResult;
}
