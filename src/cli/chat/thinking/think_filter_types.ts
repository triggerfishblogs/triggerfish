/**
 * Types, interfaces, and constants for the thinking-tag stream filter.
 *
 * Defines the filter's state machine states, result shapes, and
 * regex patterns for detecting `<think>`/`<thinking>` tags.
 * @module
 */

/**
 * Filter states:
 * - `buffering`   — Accumulating initial output before displaying.
 * - `suppressing`  — Inside a `<think>` block.
 * - `normal`       — Streaming visible text.
 * - `in_tag`       — Inside a `<` tag (detecting think tags).
 */
export type ThinkFilterState =
  | "buffering"
  | "suppressing"
  | "normal"
  | "in_tag";

/** Result from the stream filter for a single chunk. */
export interface ThinkFilterResult {
  /** Non-thinking response text to display. */
  readonly visible: string;
  /** Thinking content (for expanded display). */
  readonly thinking: string;
  /** Just transitioned into a think block. */
  readonly enteredThinking: boolean;
  /** Just transitioned out of a think block. */
  readonly exitedThinking: boolean;
}

/** Incremental stream filter for thinking tags. */
export interface ThinkingFilter {
  /** Process a chunk of text, separating visible and thinking content. */
  filter(text: string): ThinkFilterResult;
  /** Reset the filter state (e.g. between streaming sessions). */
  reset(): void;
  /** Whether the filter is currently inside a thinking block. */
  readonly isThinking: boolean;
}

/**
 * Max chars to buffer before giving up on detecting thinking.
 * Covers models that output thinking content without `<think>` opening
 * tags. For non-thinking models, this adds ~1-2s latency before text
 * appears (the spinner runs during this time, so UX is fine).
 */
export const THINK_BUFFER_MAX = 1500;

/** Regex to match `<think>` or `<thinking>` opening tags. */
export const OPEN_TAG_RE = /<think(?:ing)?>/i;

/** Regex to match `</think>` or `</thinking>` closing tags. */
export const CLOSE_TAG_RE = /<\/think(?:ing)?>/i;

/** Mutable state for the character-by-character processor. */
export interface FilterState {
  state: ThinkFilterState;
  pendingBuffer: string;
  tagBuffer: string;
  closeBuffer: string;
}

/** Accumulator for character-by-character processing results. */
export interface CharAccumulator {
  visible: string;
  thinking: string;
  entered: boolean;
  exited: boolean;
}

/** Empty filter result for when still buffering. */
export const EMPTY_RESULT: ThinkFilterResult = {
  visible: "",
  thinking: "",
  enteredThinking: false,
  exitedThinking: false,
};
