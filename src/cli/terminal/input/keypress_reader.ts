/**
 * Async keypress reader that yields parsed keypresses from raw stdin.
 *
 * Puts stdin into raw mode and provides an async iterator interface
 * over individual keypress events.
 *
 * @module
 */

import type { Keypress } from "./keypress.ts";
import { parseKeypresses } from "./keypress.ts";

const enc = new TextEncoder();

// ─── Types ──────────────────────────────────────────────────────

/** Async keypress reader that yields parsed keypresses from raw stdin. */
export interface KeypressReader {
  /** Start reading keypresses in raw mode. */
  start(): void;
  /** Stop reading and restore terminal to cooked mode. */
  stop(): void;
  /** Async iterator of keypress events. */
  [Symbol.asyncIterator](): AsyncIterableIterator<Keypress>;
}

/** Mutable state shared between keypress reader methods. */
interface ReaderState {
  running: boolean;
  resolveNext: ((value: IteratorResult<Keypress>) => void) | null;
  readonly queue: Keypress[];
}

// ─── Internal helpers ───────────────────────────────────────────

/** Resolve the pending iterator consumer with a done signal. */
function signalReaderDone(state: ReaderState): void {
  if (state.resolveNext) {
    const resolve = state.resolveNext;
    state.resolveNext = null;
    resolve({ value: undefined as unknown as Keypress, done: true });
  }
}

/** Deliver a keypress to a waiting consumer or buffer it. */
function enqueueKeypress(state: ReaderState, key: Keypress): void {
  if (state.resolveNext) {
    const resolve = state.resolveNext;
    state.resolveNext = null;
    resolve({ value: key, done: false });
  } else {
    state.queue.push(key);
  }
}

/** Continuously read from stdin and parse keypresses until stopped. */
async function runStdinReadLoop(state: ReaderState): Promise<void> {
  const buf = new Uint8Array(256);
  while (state.running) {
    const n = await Deno.stdin.read(buf);
    if (n === null) {
      signalReaderDone(state);
      break;
    }
    for (const key of parseKeypresses(buf.subarray(0, n))) {
      enqueueKeypress(state, key);
    }
  }
}

/** Build the async iterator that yields keypresses from the queue. */
function buildKeypressIterator(
  state: ReaderState,
): AsyncIterableIterator<Keypress> {
  return {
    next(): Promise<IteratorResult<Keypress>> {
      if (state.queue.length > 0) {
        return Promise.resolve({ value: state.queue.shift()!, done: false });
      }
      if (!state.running) {
        return Promise.resolve({
          value: undefined as unknown as Keypress,
          done: true,
        });
      }
      return new Promise((resolve) => {
        state.resolveNext = resolve;
      });
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Create an async keypress reader.
 *
 * Puts stdin into raw mode and yields individual keypresses.
 * On stop(), restores the terminal to cooked mode.
 *
 * @returns A KeypressReader instance
 */
export function createKeypressReader(): KeypressReader {
  const state: ReaderState = { running: false, resolveNext: null, queue: [] };

  return {
    start() {
      if (state.running) return;
      state.running = true;
      if (Deno.stdin.isTerminal()) {
        Deno.stdin.setRaw(true);
        Deno.stdout.writeSync(enc.encode("\x1b[?2004h"));
      }
      runStdinReadLoop(state);
    },
    stop() {
      state.running = false;
      if (Deno.stdin.isTerminal()) {
        Deno.stdout.writeSync(enc.encode("\x1b[?2004l"));
        Deno.stdin.setRaw(false);
      }
      signalReaderDone(state);
    },
    [Symbol.asyncIterator](): AsyncIterableIterator<Keypress> {
      return buildKeypressIterator(state);
    },
  };
}
