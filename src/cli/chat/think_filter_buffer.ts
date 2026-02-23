/**
 * Buffer-phase resolution for the thinking-tag stream filter.
 *
 * Handles the initial buffering state where the filter accumulates
 * text to detect whether the stream begins with thinking content.
 * @module
 */

import type { FilterState, ThinkFilterResult } from "./think_filter_types.ts";
import {
  CLOSE_TAG_RE,
  EMPTY_RESULT,
  OPEN_TAG_RE,
  THINK_BUFFER_MAX,
} from "./think_filter_types.ts";

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

/** Process buffering-phase input. Returns result or null to continue. */
export function filterBufferingChunk(
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
