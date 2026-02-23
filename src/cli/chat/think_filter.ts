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

/** Mutable state for the character-by-character processor. */
interface FilterState {
  state: ThinkFilterState;
  pendingBuffer: string;
  tagBuffer: string;
  closeBuffer: string;
}

/** Accumulator for character-by-character processing results. */
interface CharAccumulator {
  visible: string;
  thinking: string;
  entered: boolean;
  exited: boolean;
}

/** Handle buffer containing an opening think tag. */
function resolveBufferWithOpenTag(
  buf: string,
  openMatch: RegExpMatchArray,
  fs: FilterState,
): ThinkFilterResult {
  const preOpen = buf.slice(0, openMatch.index!);
  const afterOpen = buf.slice(openMatch.index! + openMatch[0].length);
  const closeMatch = afterOpen.match(CLOSE_TAG_RE);

  if (closeMatch) {
    return resolveBufferOpenAndClose(preOpen, afterOpen, closeMatch, fs);
  }

  fs.state = "suppressing";
  fs.closeBuffer = "";
  return {
    visible: preOpen,
    thinking: afterOpen,
    enteredThinking: true,
    exitedThinking: false,
  };
}

/** Handle buffer with both opening and closing think tags. */
function resolveBufferOpenAndClose(
  preOpen: string,
  afterOpen: string,
  closeMatch: RegExpMatchArray,
  fs: FilterState,
): ThinkFilterResult {
  const thinkContent = afterOpen.slice(0, closeMatch.index!);
  const afterClose = afterOpen.slice(closeMatch.index! + closeMatch[0].length);
  fs.state = "normal";
  return {
    visible: preOpen + afterClose,
    thinking: thinkContent,
    enteredThinking: true,
    exitedThinking: true,
  };
}

/** Handle buffer containing a bare closing think tag (no opener). */
function resolveBufferWithCloseTag(
  buf: string,
  closeMatch: RegExpMatchArray,
  fs: FilterState,
): ThinkFilterResult {
  const thinkContent = buf.slice(0, closeMatch.index!);
  const afterClose = buf.slice(closeMatch.index! + closeMatch[0].length);
  fs.state = "normal";
  return {
    visible: afterClose,
    thinking: thinkContent,
    enteredThinking: true,
    exitedThinking: true,
  };
}

/** Flush the buffer as visible text (no think tags found). */
function resolveBufferAsVisible(
  buf: string,
  fs: FilterState,
): ThinkFilterResult {
  fs.state = "normal";
  return {
    visible: buf,
    thinking: "",
    enteredThinking: false,
    exitedThinking: false,
  };
}

/**
 * Resolve the pending buffer by checking for think tags.
 * Transitions state out of `buffering`.
 */
function resolveThinkBuffer(
  fs: FilterState,
  extra: string,
): ThinkFilterResult {
  const buf = fs.pendingBuffer + extra;
  fs.pendingBuffer = "";

  const openMatch = buf.match(OPEN_TAG_RE);
  if (openMatch) {
    return resolveBufferWithOpenTag(buf, openMatch, fs);
  }

  const closeMatch = buf.match(CLOSE_TAG_RE);
  if (closeMatch) {
    return resolveBufferWithCloseTag(buf, closeMatch, fs);
  }

  return resolveBufferAsVisible(buf, fs);
}

/** Empty filter result for when still buffering. */
const EMPTY_RESULT: ThinkFilterResult = {
  visible: "",
  thinking: "",
  enteredThinking: false,
  exitedThinking: false,
};

/** Process buffering-phase input. Returns result or null to continue. */
function filterBufferingChunk(
  fs: FilterState,
  text: string,
): ThinkFilterResult {
  fs.pendingBuffer += text;

  if (
    CLOSE_TAG_RE.test(fs.pendingBuffer) || OPEN_TAG_RE.test(fs.pendingBuffer)
  ) {
    return resolveThinkBuffer(fs, "");
  }

  if (fs.pendingBuffer.length >= THINK_BUFFER_MAX) {
    return resolveThinkBuffer(fs, "");
  }

  return EMPTY_RESULT;
}

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
