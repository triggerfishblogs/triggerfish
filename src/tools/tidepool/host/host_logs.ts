/**
 * Log sink for Tidepool: buffers recent lines and streams to subscribers.
 *
 * @module
 */

import type { LogEntry, LogFilter } from "../screens/logs.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("tidepool-logs");


/** Maximum number of buffered log lines. */
const MAX_BUFFER_SIZE = 500;

/** Log subscription tracking. */
interface LogSubscriber {
  readonly socket: WebSocket;
  readonly filter: LogFilter;
}

/** Tidepool log sink that captures entries and broadcasts to subscribers. */
export interface TidepoolLogSink {
  /** Write a log entry to the sink. */
  readonly write: (entry: LogEntry) => void;
  /** Subscribe a client to log events with optional filter. */
  readonly subscribe: (socket: WebSocket, filter: LogFilter) => void;
  /** Unsubscribe a client. */
  readonly unsubscribe: (socket: WebSocket) => void;
  /** Get recent buffered log lines. */
  readonly recentLines: (count: number) => readonly LogEntry[];
}

/** Check whether a log entry passes a filter. */
function matchesFilter(entry: LogEntry, filter: LogFilter): boolean {
  if (!filter.levels.has(entry.level)) return false;
  if (filter.source && entry.source !== filter.source) return false;
  if (filter.search) {
    const term = filter.search.toLowerCase();
    if (
      !entry.message.toLowerCase().includes(term) &&
      !entry.source.toLowerCase().includes(term)
    ) {
      return false;
    }
  }
  return true;
}

/** Create a Tidepool log sink. */
export function createTidepoolLogSink(): TidepoolLogSink {
  const buffer: LogEntry[] = [];
  const subscribers: LogSubscriber[] = [];

  return {
    write(entry: LogEntry): void {
      buffer.push(entry);
      if (buffer.length > MAX_BUFFER_SIZE) {
        buffer.shift();
      }

      // Broadcast to matching subscribers
      for (const sub of subscribers) {
        if (matchesFilter(entry, sub.filter)) {
          const json = JSON.stringify({
            topic: "logs",
            type: "log_entry",
            entry,
          });
          try {
            if (sub.socket.readyState === WebSocket.OPEN) {
              sub.socket.send(json);
            }
          } catch (err) {
            log.debug("Log subscriber send failed", { err });
          }
        }
      }
    },

    subscribe(socket: WebSocket, filter: LogFilter): void {
      const existing = subscribers.findIndex((s) => s.socket === socket);
      if (existing >= 0) subscribers.splice(existing, 1);
      subscribers.push({ socket, filter });

      // Send buffered lines that match filter
      const matching = buffer.filter((e) => matchesFilter(e, filter));
      const json = JSON.stringify({
        topic: "logs",
        type: "log_backfill",
        entries: matching,
      });
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(json);
        }
      } catch (err) {
        log.debug("Log backfill send failed", { err });
      }
    },

    unsubscribe(socket: WebSocket): void {
      const idx = subscribers.findIndex((s) => s.socket === socket);
      if (idx >= 0) subscribers.splice(idx, 1);
    },

    recentLines(count: number): readonly LogEntry[] {
      return buffer.slice(-count);
    },
  };
}
