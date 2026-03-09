/**
 * Taint badge color mapping types.
 *
 * Maps classification levels to visual badge styles
 * for consistent rendering across Tidepool screens.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";

/** Badge color mapping for classification levels. */
export interface TaintBadgeColors {
  readonly background: string;
  readonly foreground: string;
  readonly cssClass: string;
}

/** Color mappings for each classification level. */
export const TAINT_BADGE_MAP: Readonly<
  Record<ClassificationLevel, TaintBadgeColors>
> = {
  PUBLIC: {
    background: "var(--green)",
    foreground: "#1a1b26",
    cssClass: "public",
  },
  INTERNAL: {
    background: "var(--yellow)",
    foreground: "#1a1b26",
    cssClass: "internal",
  },
  CONFIDENTIAL: {
    background: "var(--orange)",
    foreground: "#1a1b26",
    cssClass: "confidential",
  },
  RESTRICTED: {
    background: "var(--red)",
    foreground: "#1a1b26",
    cssClass: "restricted",
  },
};

/** Get the CSS class for a classification level. */
export function resolveTaintBadgeClass(
  level: ClassificationLevel,
): string {
  return TAINT_BADGE_MAP[level]?.cssClass ?? "public";
}
