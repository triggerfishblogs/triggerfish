/**
 * Thinking sub-module — stream filter for `<think>`/`<thinking>` tags.
 * @module
 */

export type {
  CharAccumulator,
  FilterState,
  ThinkFilterResult,
  ThinkFilterState,
  ThinkingFilter,
} from "./think_filter_types.ts";
export {
  CLOSE_TAG_RE,
  EMPTY_RESULT,
  OPEN_TAG_RE,
  THINK_BUFFER_MAX,
} from "./think_filter_types.ts";

export { filterBufferingChunk } from "./think_filter_buffer.ts";

export { createThinkingFilter } from "./think_filter.ts";
