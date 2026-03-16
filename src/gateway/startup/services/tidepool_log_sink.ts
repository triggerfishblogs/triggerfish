/**
 * Tidepool log sink — pipes structured log entries from the log file.
 *
 * Polls the triggerfish log file and feeds new entries to the
 * Tidepool log sink for real-time display in the UI.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/mod.ts";
import type { createTidepoolLogSink } from "../../../tools/tidepool/host/mod.ts";

const log = createLogger("tidepool-log-sink");

/** Pipe structured log entries to the Tidepool log sink via log file polling. */
export function wireTidepoolLogSink(
  sink: ReturnType<typeof createTidepoolLogSink>,
): void {
  const home = Deno.env.get("HOME");
  if (!home) {
    log.debug("HOME env var not set, log sink polling disabled");
    return;
  }
  const logPath = `${home}/.triggerfish/logs/triggerfish.log`;

  let lastSize = 0;
  Deno.stat(logPath)
    .then((stat) => {
      lastSize = stat.size;
    })
    .catch((err: unknown) => {
      log.debug("Log file not found at startup, will poll", { err });
    })
    .finally(() => {
      startLogPollLoop(sink, logPath, lastSize);
    });
}

/** Start async poll loop using setTimeout to avoid blocking the event loop. */
function startLogPollLoop(
  sink: ReturnType<typeof createTidepoolLogSink>,
  logPath: string,
  initialSize: number,
): void {
  let lastSize = initialSize;
  const tick = (): void => {
    pollLogFileAsync(sink, logPath, lastSize)
      .then((newSize) => {
        lastSize = newSize;
      })
      .catch((err: unknown) => {
        log.debug("Log file poll failed, may be rotated", { err });
      })
      .finally(() => {
        const timer = setTimeout(tick, 1000);
        Deno.unrefTimer(timer);
      });
  };
  const timer = setTimeout(tick, 1000);
  Deno.unrefTimer(timer);
}

/** Read new lines from the log file and feed them to the sink (async). */
async function pollLogFileAsync(
  sink: ReturnType<typeof createTidepoolLogSink>,
  logPath: string,
  lastSize: number,
): Promise<number> {
  const stat = await Deno.stat(logPath);
  if (stat.size <= lastSize) return lastSize;

  const file = await Deno.open(logPath, { read: true });
  try {
    await file.seek(lastSize, Deno.SeekMode.Start);
    const buf = new Uint8Array(stat.size - lastSize);
    await file.read(buf);
    feedLogLinesToSink(sink, buf);
  } finally {
    file.close();
  }
  return stat.size;
}

/** Parse log lines from raw bytes and write entries to the sink. */
function feedLogLinesToSink(
  sink: ReturnType<typeof createTidepoolLogSink>,
  buf: Uint8Array,
): void {
  const text = new TextDecoder().decode(buf);
  const lines = text.split("\n").filter((l) => l.length > 0);
  const logLineRegex = /^\[([^\]]+)\]\s+\[(\w+)\]\s+\[([^\]]+)\]\s+(.*)/;

  for (const line of lines) {
    const match = line.match(logLineRegex);
    if (match) {
      sink.write({
        timestamp: match[1],
        level: match[2] as "DEBUG" | "INFO" | "WARN" | "ERROR",
        source: match[3],
        message: match[4],
      });
    }
  }
}
