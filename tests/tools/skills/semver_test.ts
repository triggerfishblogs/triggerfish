/**
 * @module semver_test
 *
 * Tests for semver comparison logic used by The Reef registry.
 */
import { assertEquals } from "@std/assert";
import { compareSemver } from "../../../src/tools/skills/registry.ts";

Deno.test("compareSemver: equal versions return 0", () => {
  assertEquals(compareSemver("1.0.0", "1.0.0"), 0);
});

Deno.test("compareSemver: major version difference", () => {
  assertEquals(compareSemver("2.0.0", "1.0.0"), 1);
  assertEquals(compareSemver("1.0.0", "2.0.0"), -1);
});

Deno.test("compareSemver: minor version difference", () => {
  assertEquals(compareSemver("1.1.0", "1.0.0"), 1);
  assertEquals(compareSemver("1.0.0", "1.1.0"), -1);
});

Deno.test("compareSemver: patch version difference", () => {
  assertEquals(compareSemver("1.0.1", "1.0.0"), 1);
  assertEquals(compareSemver("1.0.0", "1.0.1"), -1);
});

Deno.test("compareSemver: handles missing parts", () => {
  assertEquals(compareSemver("1.0", "1.0.0"), 0);
  assertEquals(compareSemver("1", "1.0.0"), 0);
});

Deno.test("compareSemver: strips pre-release suffixes", () => {
  assertEquals(compareSemver("1.0.0-beta", "1.0.0"), 0);
  assertEquals(compareSemver("1.0.0", "1.0.0-beta"), 0);
  assertEquals(compareSemver("1.0.1-rc.1", "1.0.0"), 1);
  assertEquals(compareSemver("1.0.0-beta", "1.0.1"), -1);
});
