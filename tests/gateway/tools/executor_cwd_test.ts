/**
 * Tests for CWD tracking in the tool executor dispatch layer.
 */
import { assertEquals } from "@std/assert";
import {
  computeNewCwd,
  createCwdTracker,
  extractCdTarget,
  normalizePosixRelative,
  resolveAgainstCwd,
  updateCwdAfterCommand,
} from "../../../src/gateway/tools/executor/executor_cwd.ts";

// ─── normalizePosixRelative ──────────────────────────────────────────────────

Deno.test("normalizePosixRelative: simple path unchanged", () => {
  assertEquals(normalizePosixRelative("src/main.ts"), "src/main.ts");
});

Deno.test("normalizePosixRelative: resolves dot segments", () => {
  assertEquals(normalizePosixRelative("src/./main.ts"), "src/main.ts");
});

Deno.test("normalizePosixRelative: resolves parent segments", () => {
  assertEquals(normalizePosixRelative("src/foo/../main.ts"), "src/main.ts");
});

Deno.test("normalizePosixRelative: empty path normalizes to root", () => {
  assertEquals(normalizePosixRelative(""), ".");
});

Deno.test("normalizePosixRelative: single dot normalizes to root", () => {
  assertEquals(normalizePosixRelative("."), ".");
});

Deno.test("normalizePosixRelative: returns null when escaping root", () => {
  assertEquals(normalizePosixRelative(".."), null);
});

Deno.test("normalizePosixRelative: returns null on deep escape", () => {
  assertEquals(normalizePosixRelative("src/../../.."), null);
});

Deno.test("normalizePosixRelative: strips trailing slash via segment logic", () => {
  assertEquals(normalizePosixRelative("src/foo/"), "src/foo");
});

// ─── extractCdTarget ─────────────────────────────────────────────────────────

Deno.test("extractCdTarget: simple cd", () => {
  assertEquals(extractCdTarget("cd src"), "src");
});

Deno.test("extractCdTarget: cd with &&", () => {
  assertEquals(extractCdTarget("cd src && ls"), "src");
});

Deno.test("extractCdTarget: cd with semicolon", () => {
  assertEquals(extractCdTarget("cd src; ls"), "src");
});

Deno.test("extractCdTarget: no cd returns null", () => {
  assertEquals(extractCdTarget("ls -la"), null);
});

Deno.test("extractCdTarget: cd not at start returns null", () => {
  assertEquals(extractCdTarget("ls && cd foo"), null);
});

Deno.test("extractCdTarget: cd with no argument returns null", () => {
  assertEquals(extractCdTarget("cd"), null);
});

Deno.test("extractCdTarget: cd with path containing dots", () => {
  assertEquals(extractCdTarget("cd ../src"), "../src");
});

Deno.test("extractCdTarget: cd to absolute path", () => {
  assertEquals(extractCdTarget("cd /usr/local"), "/usr/local");
});

Deno.test("extractCdTarget: cd to home", () => {
  assertEquals(extractCdTarget("cd ~"), "~");
});

// ─── computeNewCwd ───────────────────────────────────────────────────────────

Deno.test("computeNewCwd: cd into subdirectory from root", () => {
  assertEquals(computeNewCwd(".", "src"), "src");
});

Deno.test("computeNewCwd: cd into nested subdirectory", () => {
  assertEquals(computeNewCwd("src", "lib"), "src/lib");
});

Deno.test("computeNewCwd: cd .. from subdirectory", () => {
  assertEquals(computeNewCwd("src/lib", ".."), "src");
});

Deno.test("computeNewCwd: cd .. from root returns null (escape)", () => {
  assertEquals(computeNewCwd(".", ".."), null);
});

Deno.test("computeNewCwd: cd ../../../etc from shallow dir returns null", () => {
  assertEquals(computeNewCwd("src", "../../../etc"), null);
});

Deno.test("computeNewCwd: cd ~ returns root", () => {
  assertEquals(computeNewCwd("src/lib", "~"), ".");
});

Deno.test("computeNewCwd: cd ~/ returns root", () => {
  assertEquals(computeNewCwd("src/lib", "~/"), ".");
});

Deno.test("computeNewCwd: cd ~/foo returns foo", () => {
  assertEquals(computeNewCwd("src/lib", "~/foo"), "foo");
});

Deno.test("computeNewCwd: absolute path strips leading slash", () => {
  assertEquals(computeNewCwd("src", "/usr"), "usr");
});

Deno.test("computeNewCwd: absolute root returns root", () => {
  assertEquals(computeNewCwd("src", "/"), ".");
});

Deno.test("computeNewCwd: relative with dots", () => {
  assertEquals(computeNewCwd("a/b/c", "../../d"), "a/d");
});

// ─── resolveAgainstCwd ───────────────────────────────────────────────────────

Deno.test("resolveAgainstCwd: absolute path unchanged", () => {
  const tracker = createCwdTracker();
  tracker.workingDir = "src";
  assertEquals(resolveAgainstCwd(tracker, "/foo/bar"), "/foo/bar");
});

Deno.test("resolveAgainstCwd: root tracker is identity", () => {
  const tracker = createCwdTracker();
  assertEquals(resolveAgainstCwd(tracker, "src/main.ts"), "src/main.ts");
});

Deno.test("resolveAgainstCwd: prepends CWD to relative path", () => {
  const tracker = createCwdTracker();
  tracker.workingDir = "triggerfish";
  assertEquals(
    resolveAgainstCwd(tracker, "src/main.ts"),
    "triggerfish/src/main.ts",
  );
});

Deno.test("resolveAgainstCwd: resolves dots in combined path", () => {
  const tracker = createCwdTracker();
  tracker.workingDir = "triggerfish/src";
  assertEquals(
    resolveAgainstCwd(tracker, "../README.md"),
    "triggerfish/README.md",
  );
});

// ─── updateCwdAfterCommand ───────────────────────────────────────────────────

Deno.test("updateCwdAfterCommand: updates on successful cd", () => {
  const tracker = createCwdTracker();
  updateCwdAfterCommand(tracker, "cd src", 0);
  assertEquals(tracker.workingDir, "src");
});

Deno.test("updateCwdAfterCommand: no update on failed cd", () => {
  const tracker = createCwdTracker();
  updateCwdAfterCommand(tracker, "cd nonexistent", 1);
  assertEquals(tracker.workingDir, ".");
});

Deno.test("updateCwdAfterCommand: no update on non-cd command", () => {
  const tracker = createCwdTracker();
  updateCwdAfterCommand(tracker, "ls -la", 0);
  assertEquals(tracker.workingDir, ".");
});

Deno.test("updateCwdAfterCommand: no update when cd escapes root", () => {
  const tracker = createCwdTracker();
  updateCwdAfterCommand(tracker, "cd ../..", 0);
  assertEquals(tracker.workingDir, ".");
});

Deno.test("updateCwdAfterCommand: sequential cd navigation", () => {
  const tracker = createCwdTracker();
  updateCwdAfterCommand(tracker, "cd triggerfish", 0);
  assertEquals(tracker.workingDir, "triggerfish");
  updateCwdAfterCommand(tracker, "cd src", 0);
  assertEquals(tracker.workingDir, "triggerfish/src");
  updateCwdAfterCommand(tracker, "cd ..", 0);
  assertEquals(tracker.workingDir, "triggerfish");
});

Deno.test("updateCwdAfterCommand: cd with && at start", () => {
  const tracker = createCwdTracker();
  updateCwdAfterCommand(tracker, "cd src && ls", 0);
  assertEquals(tracker.workingDir, "src");
});

Deno.test("updateCwdAfterCommand: cd not at start ignored", () => {
  const tracker = createCwdTracker();
  updateCwdAfterCommand(tracker, "ls && cd foo", 0);
  assertEquals(tracker.workingDir, ".");
});

// ─── createCwdTracker ────────────────────────────────────────────────────────

Deno.test("createCwdTracker: starts at workspace root", () => {
  const tracker = createCwdTracker();
  assertEquals(tracker.workingDir, ".");
});

// ─── End-to-end scenario ─────────────────────────────────────────────────────

Deno.test("end-to-end: agent navigates, file paths resolve correctly", () => {
  const tracker = createCwdTracker();

  // Agent: cd triggerfish
  updateCwdAfterCommand(tracker, "cd triggerfish", 0);
  assertEquals(tracker.workingDir, "triggerfish");

  // Agent: read_file(path="src/main.ts")
  const resolved = resolveAgainstCwd(tracker, "src/main.ts");
  assertEquals(resolved, "triggerfish/src/main.ts");

  // Agent: cd src
  updateCwdAfterCommand(tracker, "cd src", 0);
  assertEquals(tracker.workingDir, "triggerfish/src");

  // Agent: read_file(path="main.ts")
  assertEquals(
    resolveAgainstCwd(tracker, "main.ts"),
    "triggerfish/src/main.ts",
  );

  // Agent: read_file(path="/README.md") — absolute, unchanged
  assertEquals(resolveAgainstCwd(tracker, "/README.md"), "/README.md");

  // Agent: cd ~
  updateCwdAfterCommand(tracker, "cd ~", 0);
  assertEquals(tracker.workingDir, ".");

  // Back at root — identity
  assertEquals(resolveAgainstCwd(tracker, "src/main.ts"), "src/main.ts");
});
