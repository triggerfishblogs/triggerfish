/**
 * Web search provider interface and implementations.
 *
 * Facade re-exporting from search_types, search_brave, search_cloud,
 * and search_rate_limit. Import from here for the full search API.
 *
 * @module
 */

export type {
  SearchOptions,
  SearchProvider,
  SearchResult,
  SearchResultItem,
} from "./search_types.ts";

export {
  type BraveSearchConfig,
  createBraveSearchProvider,
} from "./search_brave.ts";

export {
  type CloudSearchConfig,
  createCloudSearchProvider,
} from "./search_cloud.ts";

export { createRateLimitedSearchProvider } from "./search_rate_limit.ts";
