/**
 * Incremental stream filter for `<think>`/`<thinking>` tags.
 *
 * Separates visible response text from thinking content during
 * streaming, enabling compact mode (hide thinking) and expanded
 * mode (show thinking dimmed).
 * @module
 */

export type {
  ThinkFilterResult,
  ThinkingFilter,
} from "./think_filter_types.ts";
import type {
  CharAccumulator,
  FilterState,
  ThinkFilterResult,
  ThinkingFilter,
} from "./think_filter_types.ts";
import { filterBufferingChunk } from "./think_filter_buffer.ts";

// ─── Character-level state handlers ─────────────────────────────

/** Process a character in `normal` state. */
function processNormalChar(
  ch: string,
  fs: FilterState,
  acc: CharAccumulator,
): void {
  if (ch === "<") {
    fs.state = "in_tag";
    fs.tagBuffer = "<";
  } else {
    acc.visible += ch;
  }
}

/** Finalize a completed tag buffer when `>` is encountered. */
function finalizeTagBuffer(fs: FilterState, acc: CharAccumulator): void {
  if (/^<think(?:ing)?>$/i.test(fs.tagBuffer)) {
    fs.state = "suppressing";
    acc.entered = true;
    fs.tagBuffer = "";
    fs.closeBuffer = "";
  } else if (/^<\/think(?:ing)?>$/i.test(fs.tagBuffer)) {
    fs.tagBuffer = "";
    fs.state = "normal";
  } else {
    acc.visible += fs.tagBuffer;
    fs.tagBuffer = "";
    fs.state = "normal";
  }
}

/** Process a character in `in_tag` state. */
function processInTagChar(
  ch: string,
  fs: FilterState,
  acc: CharAccumulator,
): void {
  fs.tagBuffer += ch;
  if (ch === ">") {
    finalizeTagBuffer(fs, acc);
  } else if (fs.tagBuffer.length > 12) {
    acc.visible += fs.tagBuffer;
    fs.tagBuffer = "";
    fs.state = "normal";
  }
}

/** Check if the close buffer ends with a closing think tag. */
function detectSuppressingCloseTag(
  fs: FilterState,
  acc: CharAccumulator,
): void {
  if (!/<\/think(?:ing)?>$/i.test(fs.closeBuffer)) return;

  acc.exited = true;
  const match = fs.closeBuffer.match(/<\/think(?:ing)?>$/i);
  if (match) {
    acc.thinking = acc.thinking.slice(0, -match[0].length);
  }
  fs.state = "normal";
  fs.closeBuffer = "";
}

/** Process a character in `suppressing` state. */
function processSuppressingChar(
  ch: string,
  fs: FilterState,
  acc: CharAccumulator,
): void {
  acc.thinking += ch;
  fs.closeBuffer += ch;
  if (fs.closeBuffer.length > 12) {
    fs.closeBuffer = fs.closeBuffer.slice(-12);
  }
  if (ch === ">") {
    detectSuppressingCloseTag(fs, acc);
  }
}

// ─── State machine dispatch ─────────────────────────────────────

/** Dispatch a single character to the appropriate state handler. */
function dispatchCharToStateHandler(
  ch: string,
  fs: FilterState,
  acc: CharAccumulator,
): void {
  switch (fs.state) {
    case "normal":
      processNormalChar(ch, fs, acc);
      break;
    case "in_tag":
      processInTagChar(ch, fs, acc);
      break;
    case "suppressing":
      processSuppressingChar(ch, fs, acc);
      break;
    default:
      break;
  }
}

/** Run the character-by-character state machine over text. */
function filterStreamChunk(
  fs: FilterState,
  text: string,
): ThinkFilterResult {
  const acc: CharAccumulator = {
    visible: "",
    thinking: "",
    entered: false,
    exited: false,
  };

  for (const ch of text) {
    dispatchCharToStateHandler(ch, fs, acc);
  }

  return {
    visible: acc.visible,
    thinking: acc.thinking,
    enteredThinking: acc.entered,
    exitedThinking: acc.exited,
  };
}

// ─── Factory ─────────────────────────────────────────────────────

/** Reset filter state to initial buffering mode. */
function resetFilterState(fs: FilterState): void {
  fs.state = "buffering";
  fs.pendingBuffer = "";
  fs.tagBuffer = "";
  fs.closeBuffer = "";
}

/** Create a stream filter for thinking tags. */
export function createThinkingFilter(): ThinkingFilter {
  const fs: FilterState = {
    state: "buffering",
    pendingBuffer: "",
    tagBuffer: "",
    closeBuffer: "",
  };

  return {
    get isThinking(): boolean {
      return fs.state === "suppressing" || fs.state === "buffering";
    },
    filter(text: string): ThinkFilterResult {
      if (fs.state === "buffering") {
        return filterBufferingChunk(fs, text);
      }
      return filterStreamChunk(fs, text);
    },
    reset(): void {
      resetFilterState(fs);
    },
  };
}
