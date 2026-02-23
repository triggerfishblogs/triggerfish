/**
 * Thinking sub-module — stream filter for `<think>`/`<thinking>` tags.
 * @module
 */

export type {
  ThinkFilterState,
  ThinkFilterResult,
  ThinkingFilter,
  FilterState,
  CharAccumulator,
} from "./think_filter_types.ts";
export {
  THINK_BUFFER_MAX,
  OPEN_TAG_RE,
  CLOSE_TAG_RE,
  EMPTY_RESULT,
} from "./think_filter_types.ts";

export { filterBufferingChunk } from "./think_filter_buffer.ts";

export { createThinkingFilter } from "./think_filter.ts";
