/**
 * Search provider interfaces and shared types.
 *
 * Defines the pluggable SearchProvider interface, search options,
 * and result shapes used by all search provider implementations.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";

/** Options for a web search query. */
export interface SearchOptions {
  readonly maxResults?: number;
  readonly language?: string;
  readonly region?: string;
  readonly safeSearch?: "off" | "moderate" | "strict";
}

/** A single search result item. */
export interface SearchResultItem {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly publishedDate?: string;
}

/** The complete result of a search query. */
export interface SearchResult {
  readonly query: string;
  readonly results: readonly SearchResultItem[];
  readonly totalEstimate?: number;
}

/** A pluggable web search provider. */
export interface SearchProvider {
  readonly id: string;
  readonly name: string;
  /** Execute a search query. */
  search(
    query: string,
    options?: SearchOptions,
  ): Promise<Result<SearchResult, string>>;
}
