/**
 * Tests for the structured logger.
 */
import { assertEquals, assert, assertStringIncludes } from "@std/assert";
import {
  initLogger,
  shutdownLogger,
  createLogger,
  isLoggerInitialized,
} from "../../../src/core/logger/logger.ts";
import type { FileWriter } from "../../../src/core/logger/writer.ts";

/** In-memory FileWriter for testing. */
function createTestWriter(): FileWriter & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    write(line: string): Promise<void> {
      lines.push(line);
      return Promise.resolve();
    },
    close(): Promise<void> {
      return Promise.resolve();
    },
  };
}

Deno.test("Logger: format includes timestamp, level, and component", () => {
  const writer = createTestWriter();
  initLogger({ level: "TRACE", fileWriter: writer, console: false });

  const log = createLogger("gateway");
  log.info("server started");

  assertEquals(writer.lines.length, 1);
  const line = writer.lines[0];
  // Check format: [ISO timestamp] [INFO] [gateway] server started
  assert(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/.test(line), "should start with ISO timestamp");
  assertStringIncludes(line, "[INFO]");
  assertStringIncludes(line, "[gateway]");
  assertStringIncludes(line, "server started");
  assert(line.endsWith("\n"), "should end with newline");

  shutdownLogger();
});

Deno.test("Logger: level filtering — INFO threshold blocks DEBUG/TRACE", () => {
  const writer = createTestWriter();
  initLogger({ level: "INFO", fileWriter: writer, console: false });

  const log = createLogger("test");
  log.error("e");
  log.warn("w");
  log.info("i");
  log.debug("d");
  log.trace("t");

  // Only ERROR, WARN, INFO should pass
  assertEquals(writer.lines.length, 3);
  assertStringIncludes(writer.lines[0], "[ERROR]");
  assertStringIncludes(writer.lines[1], "[WARN]");
  assertStringIncludes(writer.lines[2], "[INFO]");

  shutdownLogger();
});

Deno.test("Logger: ERROR threshold only passes errors", () => {
  const writer = createTestWriter();
  initLogger({ level: "ERROR", fileWriter: writer, console: false });

  const log = createLogger("test");
  log.error("e");
  log.warn("w");
  log.info("i");

  assertEquals(writer.lines.length, 1);
  assertStringIncludes(writer.lines[0], "[ERROR]");

  shutdownLogger();
});

Deno.test("Logger: TRACE threshold passes everything", () => {
  const writer = createTestWriter();
  initLogger({ level: "TRACE", fileWriter: writer, console: false });

  const log = createLogger("test");
  log.error("e");
  log.warn("w");
  log.info("i");
  log.debug("d");
  log.trace("t");

  assertEquals(writer.lines.length, 5);

  shutdownLogger();
});

Deno.test("Logger: additional args are appended", () => {
  const writer = createTestWriter();
  initLogger({ level: "INFO", fileWriter: writer, console: false });

  const log = createLogger("test");
  log.info("count:", 42, { key: "val" });

  assertEquals(writer.lines.length, 1);
  assertStringIncludes(writer.lines[0], "count:");
  assertStringIncludes(writer.lines[0], "42");
  assertStringIncludes(writer.lines[0], '{"key":"val"}');

  shutdownLogger();
});

Deno.test("Logger: graceful degradation without initLogger", () => {
  // After shutdownLogger, creating a logger should not throw
  shutdownLogger();

  const log = createLogger("test");
  // These should not throw — they just write to stderr at INFO default
  log.info("this goes to stderr only");
  log.debug("this is filtered at INFO default");
});

Deno.test("Logger: isLoggerInitialized tracks state", () => {
  shutdownLogger();
  assertEquals(isLoggerInitialized(), false);

  initLogger({ level: "INFO", console: false });
  assertEquals(isLoggerInitialized(), true);

  shutdownLogger();
  assertEquals(isLoggerInitialized(), false);
});

Deno.test("Logger: shutdownLogger is safe to call multiple times", async () => {
  initLogger({ level: "INFO", console: false });
  await shutdownLogger();
  await shutdownLogger(); // second call should not throw
});

Deno.test("Logger: multiple components share config", () => {
  const writer = createTestWriter();
  initLogger({ level: "WARN", fileWriter: writer, console: false });

  const logA = createLogger("alpha");
  const logB = createLogger("beta");

  logA.warn("a-warn");
  logB.error("b-error");
  logA.info("a-info"); // filtered

  assertEquals(writer.lines.length, 2);
  assertStringIncludes(writer.lines[0], "[alpha]");
  assertStringIncludes(writer.lines[1], "[beta]");

  shutdownLogger();
});

Deno.test("Logger: reinitialize changes threshold", () => {
  const writer = createTestWriter();
  initLogger({ level: "ERROR", fileWriter: writer, console: false });

  const log = createLogger("test");
  log.warn("filtered");
  assertEquals(writer.lines.length, 0);

  // Re-init with lower threshold
  initLogger({ level: "WARN", fileWriter: writer, console: false });
  log.warn("visible");
  assertEquals(writer.lines.length, 1);

  shutdownLogger();
});
