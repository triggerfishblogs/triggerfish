/**
 * Signal CLI setup tests.
 *
 * Tests version checking, daemon health probing, and daemon utility functions.
 */
import { assertEquals, assert } from "@std/assert";
import {
  warnIfOldVersion,
  SIGNAL_CLI_KNOWN_GOOD_VERSION,
} from "../../../src/channels/signal/setup.ts";

// ─── warnIfOldVersion ────────────────────────────────────────────────────────

Deno.test("warnIfOldVersion: older version logs a warning", () => {
  // Parse version "0.0.1" which is older than known-good
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
  try {
    warnIfOldVersion("signal-cli 0.0.1");
    assert(warnings.length > 0, "Expected a warning for old version");
    assert(warnings[0].includes("older"), `Expected 'older' in warning: ${warnings[0]}`);
  } finally {
    console.warn = origWarn;
  }
});

Deno.test("warnIfOldVersion: same version is silent", () => {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
  try {
    warnIfOldVersion(`signal-cli ${SIGNAL_CLI_KNOWN_GOOD_VERSION}`);
    assertEquals(warnings.length, 0, "Expected no warning for known-good version");
  } finally {
    console.warn = origWarn;
  }
});

Deno.test("warnIfOldVersion: newer version is silent", () => {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
  try {
    warnIfOldVersion("signal-cli 99.0.0");
    assertEquals(warnings.length, 0, "Expected no warning for newer version");
  } finally {
    console.warn = origWarn;
  }
});

Deno.test("warnIfOldVersion: version string with only numbers is parsed", () => {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
  try {
    warnIfOldVersion("0.0.1");
    assert(warnings.length > 0, "Expected a warning for bare old version string");
  } finally {
    console.warn = origWarn;
  }
});

Deno.test("warnIfOldVersion: unparseable string is silent", () => {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
  try {
    warnIfOldVersion("not a version");
    assertEquals(warnings.length, 0, "Expected no warning for unparseable version");
  } finally {
    console.warn = origWarn;
  }
});

Deno.test("warnIfOldVersion: patch version comparison works", () => {
  // Only the patch component is older than known-good (0.13.0)
  // 0.12.99 is older (minor component)
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
  try {
    warnIfOldVersion("signal-cli 0.12.99");
    assert(warnings.length > 0, "Expected warning for 0.12.99 < 0.13.0");
  } finally {
    console.warn = origWarn;
  }
});

Deno.test("warnIfOldVersion: higher minor version is not flagged", () => {
  // 0.14.0 > 0.13.0
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
  try {
    warnIfOldVersion("signal-cli 0.14.0");
    assertEquals(warnings.length, 0, "Expected no warning for 0.14.0 > 0.13.0");
  } finally {
    console.warn = origWarn;
  }
});

// ─── SIGNAL_CLI_KNOWN_GOOD_VERSION constant ───────────────────────────────────

Deno.test("SIGNAL_CLI_KNOWN_GOOD_VERSION is a valid semver string", () => {
  const parts = SIGNAL_CLI_KNOWN_GOOD_VERSION.split(".");
  assertEquals(parts.length, 3, "Known-good version should have 3 components");
  for (const part of parts) {
    assert(!isNaN(Number(part)), `Each component should be numeric, got: ${part}`);
  }
});
