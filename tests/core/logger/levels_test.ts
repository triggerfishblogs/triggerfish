/**
 * Tests for log level ordering and user-level parsing.
 */
import { assertEquals } from "@std/assert";
import { shouldLog, parseUserLogLevel, USER_LEVEL_MAP } from "../../../src/core/logger/levels.ts";
import type { LogLevel, UserLogLevel } from "../../../src/core/logger/levels.ts";

// --- shouldLog threshold tests ---

Deno.test("shouldLog: ERROR passes all thresholds", () => {
  const levels: LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"];
  for (const threshold of levels) {
    assertEquals(shouldLog("ERROR", threshold), true, `ERROR should pass ${threshold}`);
  }
});

Deno.test("shouldLog: TRACE only passes TRACE threshold", () => {
  assertEquals(shouldLog("TRACE", "TRACE"), true);
  assertEquals(shouldLog("TRACE", "DEBUG"), false);
  assertEquals(shouldLog("TRACE", "INFO"), false);
  assertEquals(shouldLog("TRACE", "WARN"), false);
  assertEquals(shouldLog("TRACE", "ERROR"), false);
});

Deno.test("shouldLog: INFO passes INFO, DEBUG, TRACE thresholds", () => {
  assertEquals(shouldLog("INFO", "ERROR"), false);
  assertEquals(shouldLog("INFO", "WARN"), false);
  assertEquals(shouldLog("INFO", "INFO"), true);
  assertEquals(shouldLog("INFO", "DEBUG"), true);
  assertEquals(shouldLog("INFO", "TRACE"), true);
});

Deno.test("shouldLog: WARN passes WARN and above thresholds", () => {
  assertEquals(shouldLog("WARN", "ERROR"), false);
  assertEquals(shouldLog("WARN", "WARN"), true);
  assertEquals(shouldLog("WARN", "INFO"), true);
  assertEquals(shouldLog("WARN", "DEBUG"), true);
  assertEquals(shouldLog("WARN", "TRACE"), true);
});

Deno.test("shouldLog: DEBUG passes DEBUG and TRACE thresholds", () => {
  assertEquals(shouldLog("DEBUG", "ERROR"), false);
  assertEquals(shouldLog("DEBUG", "WARN"), false);
  assertEquals(shouldLog("DEBUG", "INFO"), false);
  assertEquals(shouldLog("DEBUG", "DEBUG"), true);
  assertEquals(shouldLog("DEBUG", "TRACE"), true);
});

// --- parseUserLogLevel tests ---

Deno.test("parseUserLogLevel: valid levels", () => {
  const cases: [string, UserLogLevel][] = [
    ["quiet", "quiet"],
    ["normal", "normal"],
    ["verbose", "verbose"],
    ["debug", "debug"],
  ];
  for (const [input, expected] of cases) {
    assertEquals(parseUserLogLevel(input), expected, `"${input}" → "${expected}"`);
  }
});

Deno.test("parseUserLogLevel: case insensitive", () => {
  assertEquals(parseUserLogLevel("QUIET"), "quiet");
  assertEquals(parseUserLogLevel("Debug"), "debug");
  assertEquals(parseUserLogLevel("VERBOSE"), "verbose");
});

Deno.test("parseUserLogLevel: unknown values fall back to normal", () => {
  assertEquals(parseUserLogLevel(""), "normal");
  assertEquals(parseUserLogLevel("trace"), "normal");
  assertEquals(parseUserLogLevel("garbage"), "normal");
  assertEquals(parseUserLogLevel("info"), "normal");
});

Deno.test("parseUserLogLevel: trims whitespace", () => {
  assertEquals(parseUserLogLevel("  debug  "), "debug");
  assertEquals(parseUserLogLevel("\tquiet\n"), "quiet");
});

// --- USER_LEVEL_MAP coverage ---

Deno.test("USER_LEVEL_MAP: quiet maps to ERROR", () => {
  assertEquals(USER_LEVEL_MAP.quiet, "ERROR");
});

Deno.test("USER_LEVEL_MAP: normal maps to INFO", () => {
  assertEquals(USER_LEVEL_MAP.normal, "INFO");
});

Deno.test("USER_LEVEL_MAP: verbose maps to DEBUG", () => {
  assertEquals(USER_LEVEL_MAP.verbose, "DEBUG");
});

Deno.test("USER_LEVEL_MAP: debug maps to TRACE", () => {
  assertEquals(USER_LEVEL_MAP.debug, "TRACE");
});
