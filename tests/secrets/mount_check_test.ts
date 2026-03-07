/**
 * Tests for mount point verification.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { parseMountPoints } from "../../src/core/secrets/validation/mount_check.ts";

// --- parseMountPoints unit tests ---

Deno.test("parseMountPoints: parses typical mountinfo with /data mount", () => {
  const content = [
    "22 1 0:21 / / rw,relatime - overlay overlay rw",
    "23 22 0:22 / /proc rw,nosuid,nodev,noexec,relatime - proc proc rw",
    "24 22 0:23 / /dev rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755",
    "30 22 0:29 / /data rw,relatime - ext4 /dev/sda1 rw",
    "31 22 0:30 / /sys rw,nosuid,nodev,noexec,relatime - sysfs sysfs rw",
  ].join("\n");

  const mounts = parseMountPoints(content);
  assertEquals(mounts.includes("/data"), true);
  assertEquals(mounts.includes("/"), true);
  assertEquals(mounts.includes("/proc"), true);
});

Deno.test("parseMountPoints: returns empty array for empty content", () => {
  assertEquals(parseMountPoints(""), []);
  assertEquals(parseMountPoints("  \n  \n"), []);
});

Deno.test("parseMountPoints: no /data mount present", () => {
  const content = [
    "22 1 0:21 / / rw,relatime - overlay overlay rw",
    "23 22 0:22 / /proc rw,nosuid - proc proc rw",
  ].join("\n");

  const mounts = parseMountPoints(content);
  assertEquals(mounts.includes("/data"), false);
  assertEquals(mounts.includes("/"), true);
});

Deno.test("parseMountPoints: handles tmpfs mount at /keys", () => {
  const content = [
    "22 1 0:21 / / rw,relatime - overlay overlay rw",
    "35 22 0:35 / /keys rw,noexec,nosuid,size=10240k - tmpfs tmpfs rw",
    "30 22 0:29 / /data rw,relatime - ext4 /dev/sda1 rw",
  ].join("\n");

  const mounts = parseMountPoints(content);
  assertEquals(mounts.includes("/keys"), true);
  assertEquals(mounts.includes("/data"), true);
});

Deno.test("parseMountPoints: handles lines with optional tags before separator", () => {
  // mountinfo lines can have optional "shared:N" tags between options and " - "
  const content =
    "30 22 0:29 / /data rw,relatime shared:1 - ext4 /dev/sda1 rw\n";

  const mounts = parseMountPoints(content);
  assertEquals(mounts.includes("/data"), true);
});
