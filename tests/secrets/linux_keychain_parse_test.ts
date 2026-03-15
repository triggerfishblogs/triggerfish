/**
 * Tests for parseLinuxSecretSearchOutput — the parser that extracts
 * secret names from `secret-tool search --all` stdout.
 *
 * `secret-tool search` emits attribute metadata (attribute.key, attribute.service)
 * to stderr and structured fields (label, secret, created, modified) to stdout.
 * The parser reads `label = triggerfish:<name>` lines from stdout.
 */

import { assertEquals } from "@std/assert";
import { parseLinuxSecretSearchOutput } from "../../src/core/secrets/keychain/linux_keychain.ts";

Deno.test("parseLinuxSecretSearchOutput extracts names from single entry", () => {
  const stdout = [
    "[/3]",
    "label = triggerfish:api_key",
    "secret = sk-12345",
    "created = 2026-03-12 16:12:43",
    "modified = 2026-03-12 16:12:43",
  ].join("\n");

  assertEquals(parseLinuxSecretSearchOutput(stdout), ["api_key"]);
});

Deno.test("parseLinuxSecretSearchOutput extracts names from multiple entries", () => {
  const stdout = [
    "[/3]",
    "label = triggerfish:cloud:licenseKey",
    "secret = tf_test_abc123",
    "created = 2026-03-12 16:12:43",
    "modified = 2026-03-12 16:12:43",
    "[/5]",
    "label = triggerfish:ssh_user:username",
    "secret = venom",
    "created = 2026-03-12 23:11:00",
    "modified = 2026-03-12 23:11:00",
    "[/6]",
    "label = triggerfish:ssh_user:password",
    "secret = hunter2",
    "created = 2026-03-12 23:11:00",
    "modified = 2026-03-12 23:11:00",
  ].join("\n");

  const names = parseLinuxSecretSearchOutput(stdout);
  assertEquals(names.length, 3);
  assertEquals(names[0], "cloud:licenseKey");
  assertEquals(names[1], "ssh_user:username");
  assertEquals(names[2], "ssh_user:password");
});

Deno.test("parseLinuxSecretSearchOutput returns empty for no output", () => {
  assertEquals(parseLinuxSecretSearchOutput(""), []);
});

Deno.test("parseLinuxSecretSearchOutput ignores labels without triggerfish prefix", () => {
  const stdout = [
    "[/1]",
    "label = other-app:some-key",
    "secret = value",
    "created = 2026-01-01 00:00:00",
    "modified = 2026-01-01 00:00:00",
  ].join("\n");

  assertEquals(parseLinuxSecretSearchOutput(stdout), []);
});

Deno.test("parseLinuxSecretSearchOutput handles colons in secret names", () => {
  const stdout = [
    "[/1]",
    "label = triggerfish:namespace:sub:key",
    "secret = val",
    "created = 2026-01-01 00:00:00",
    "modified = 2026-01-01 00:00:00",
  ].join("\n");

  assertEquals(parseLinuxSecretSearchOutput(stdout), ["namespace:sub:key"]);
});
