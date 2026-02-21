/**
 * Incremental stream filter for `<think>`/`<thinking>` tags.
 *
 * Separates visible response text from thinking content during
 * streaming, enabling compact mode (hide thinking) and expanded
 * mode (show thinking dimmed).
 * @module
 */

/**
 * Filter states:
 * - `buffering`   — Accumulating initial output before displaying.
 * - `suppressing`  — Inside a `<think>` block.
 * - `normal`       — Streaming visible text.
 * - `in_tag`       — Inside a `<` tag (detecting think tags).
 */
type ThinkFilterState =
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
const THINK_BUFFER_MAX = 1500;

/** Regex to match `<think>` or `<thinking>` opening tags. */
const OPEN_TAG_RE = /<think(?:ing)?>/i;

/** Regex to match `</think>` or `</thinking>` closing tags. */
const CLOSE_TAG_RE = /<\/think(?:ing)?>/i;

/** Create a stream filter for thinking tags. */
export function createThinkingFilter(): ThinkingFilter {
  let state: ThinkFilterState = "buffering";
  let pendingBuffer = "";
  // For character-by-character processing:
  let tagBuffer = "";       // accumulates `<...>` tags
  let closeBuffer = "";     // sliding buffer for `</think>` detection

  /**
   * Resolve the pending buffer. Checks for think tags and returns the
   * appropriate result. Transitions state out of `buffering`.
   */
  function resolveBuffer(extra: string): ThinkFilterResult {
    const buf = pendingBuffer + extra;
    pendingBuffer = "";

    // Case 1: `<think>...content...</think>rest` — standard think tags
    const openMatch = buf.match(OPEN_TAG_RE);
    if (openMatch) {
      const preOpen = buf.slice(0, openMatch.index!);
      const afterOpen = buf.slice(openMatch.index! + openMatch[0].length);
      const closeMatch = afterOpen.match(CLOSE_TAG_RE);
      if (closeMatch) {
        const thinkContent = afterOpen.slice(0, closeMatch.index!);
        const afterClose = afterOpen.slice(closeMatch.index! + closeMatch[0].length);
        state = "normal";
        return {
          visible: preOpen + afterClose,
          thinking: thinkContent,
          enteredThinking: true,
          exitedThinking: true,
        };
      }
      state = "suppressing";
      closeBuffer = "";
      return {
        visible: preOpen,
        thinking: afterOpen,
        enteredThinking: true,
        exitedThinking: false,
      };
    }

    // Case 2: No `<think>` but `</think>` present — bare closing tag.
    const closeMatch = buf.match(CLOSE_TAG_RE);
    if (closeMatch) {
      const thinkContent = buf.slice(0, closeMatch.index!);
      const afterClose = buf.slice(closeMatch.index! + closeMatch[0].length);
      state = "normal";
      return {
        visible: afterClose,
        thinking: thinkContent,
        enteredThinking: true,
        exitedThinking: true,
      };
    }

    // Case 3: No think tags — flush as visible.
    state = "normal";
    return {
      visible: buf,
      thinking: "",
      enteredThinking: false,
      exitedThinking: false,
    };
  }

  const self: ThinkingFilter = {
    get isThinking(): boolean {
      return state === "suppressing" || state === "buffering";
    },

    filter(text: string): ThinkFilterResult {
      // ── Buffering phase: accumulate and check for tags ──
      if (state === "buffering") {
        pendingBuffer += text;

        // Check for think tags
        if (CLOSE_TAG_RE.test(pendingBuffer) || OPEN_TAG_RE.test(pendingBuffer)) {
          return resolveBuffer("");
        }

        // Buffer not resolved yet — check threshold
        if (pendingBuffer.length >= THINK_BUFFER_MAX) {
          return resolveBuffer("");
        }

        // Still buffering
        return { visible: "", thinking: "", enteredThinking: false, exitedThinking: false };
      }

      // ── Character-by-character processing ──
      let visible = "";
      let thinking = "";
      let entered = false;
      let exited = false;

      for (const ch of text) {
        switch (state) {
          case "normal":
            if (ch === "<") {
              state = "in_tag";
              tagBuffer = "<";
            } else {
              visible += ch;
            }
            break;

          case "in_tag":
            tagBuffer += ch;
            if (ch === ">") {
              if (/^<think(?:ing)?>$/i.test(tagBuffer)) {
                state = "suppressing";
                entered = true;
                tagBuffer = "";
                closeBuffer = "";
              } else if (/^<\/think(?:ing)?>$/i.test(tagBuffer)) {
                tagBuffer = "";
                state = "normal";
              } else {
                visible += tagBuffer;
                tagBuffer = "";
                state = "normal";
              }
            } else if (tagBuffer.length > 12) {
              visible += tagBuffer;
              tagBuffer = "";
              state = "normal";
            }
            break;

          case "suppressing": {
            thinking += ch;
            closeBuffer += ch;
            if (closeBuffer.length > 12) {
              closeBuffer = closeBuffer.slice(-12);
            }
            if (ch === ">" && /<\/think(?:ing)?>$/i.test(closeBuffer)) {
              exited = true;
              const match = closeBuffer.match(/<\/think(?:ing)?>$/i);
              if (match) {
                thinking = thinking.slice(0, -match[0].length);
              }
              state = "normal";
              closeBuffer = "";
            }
            break;
          }

          default:
            break;
        }
      }
      return { visible, thinking, enteredThinking: entered, exitedThinking: exited };
    },

    reset(): void {
      state = "buffering";
      pendingBuffer = "";
      tagBuffer = "";
      closeBuffer = "";
    },
  };

  return self;
}
