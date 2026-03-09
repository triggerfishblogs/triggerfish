/**
 * Memory screen types.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";

/** Memory entry as displayed in the browser. */
export interface MemoryBrowserEntry {
  readonly id: string;
  readonly content: string;
  readonly classification: ClassificationLevel;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sessionId?: string;
}

/** Memory search filter state. */
export interface MemorySearchFilter {
  readonly query?: string;
  readonly classification?: ClassificationLevel;
  readonly tags?: readonly string[];
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

/** Memory search result. */
export interface MemorySearchResult {
  readonly entries: readonly MemoryBrowserEntry[];
  readonly total: number;
  readonly hasMore: boolean;
}
