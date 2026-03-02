/**
 * Tests for Docker volume mount point validation.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { parseMountPoints } from "../../src/core/secrets/validation/mount_check.ts";

// --- parseMountPoints ---

const SAMPLE_MOUNTINFO = `\
22 1 0:21 / /sys rw,nosuid,nodev,noexec,relatime shared:7 - sysfs sysfs rw
23 1 0:22 / /proc rw,nosuid,nodev,noexec,relatime shared:14 - proc proc rw
24 1 0:5 / /dev rw,nosuid,relatime shared:2 - devtmpfs devtmpfs rw,size=8120732k
100 1 254:1 / /data rw,relatime shared:50 - ext4 /dev/vda1 rw
101 1 0:50 / /keys rw,nosuid,nodev,noexec,relatime - tmpfs tmpfs rw,size=10240k`;

Deno.test("parseMountPoints: extracts mount points from mountinfo", () => {
  const points = parseMountPoints(SAMPLE_MOUNTINFO);
  assertEquals(points.includes("/sys"), true);
  assertEquals(points.includes("/proc"), true);
  assertEquals(points.includes("/dev"), true);
  assertEquals(points.includes("/data"), true);
  assertEquals(points.includes("/keys"), true);
});

Deno.test("parseMountPoints: returns empty array for empty input", () => {
  const points = parseMountPoints("");
  assertEquals(points.length, 0);
});

Deno.test("parseMountPoints: handles whitespace-only lines", () => {
  const points = parseMountPoints("  \n\n  \n");
  assertEquals(points.length, 0);
});

const MOUNTINFO_WITHOUT_DATA = `\
22 1 0:21 / /sys rw,nosuid,nodev,noexec,relatime shared:7 - sysfs sysfs rw
23 1 0:22 / /proc rw,nosuid,nodev,noexec,relatime shared:14 - proc proc rw`;

Deno.test("parseMountPoints: /data not present when not mounted", () => {
  const points = parseMountPoints(MOUNTINFO_WITHOUT_DATA);
  assertEquals(points.includes("/data"), false);
  assertEquals(points.includes("/sys"), true);
  assertEquals(points.includes("/proc"), true);
});

Deno.test("parseMountPoints: handles single mount entry", () => {
  const input = "100 1 254:1 / /data rw,relatime shared:50 - ext4 /dev/vda1 rw";
  const points = parseMountPoints(input);
  assertEquals(points.length, 1);
  assertEquals(points[0], "/data");
});
