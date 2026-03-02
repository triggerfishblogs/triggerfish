/**
 * Tests for the changelog fetcher, formatter, and CLI command parsing.
 *
 * Tests version comparison, range filtering, and formatting without
 * making real network requests.
 */
import { assert, assertEquals } from "@std/assert";
import {
  compareVersionTags,
  normalizeVersionTag,
  parseSemver,
} from "../../src/cli/daemon/updater/changelog.ts";
import {
  formatChangelogConcatenated,
  formatChangelogMarkdown,
  formatChangelogPlainText,
} from "../../src/cli/daemon/updater/changelog_format.ts";
import type { ChangelogRange } from "../../src/cli/daemon/updater/changelog.ts";

// ─── parseSemver ─────────────────────────────────────────────────────────────

Deno.test("parseSemver: parses tag with v prefix", () => {
  const result = parseSemver("v1.2.3");
  assertEquals(result, { major: 1, minor: 2, patch: 3 });
});

Deno.test("parseSemver: parses tag without v prefix", () => {
  const result = parseSemver("0.3.3");
  assertEquals(result, { major: 0, minor: 3, patch: 3 });
});

Deno.test("parseSemver: returns null for invalid tag", () => {
  assertEquals(parseSemver("not-a-version"), null);
  assertEquals(parseSemver(""), null);
  assertEquals(parseSemver("v"), null);
});

Deno.test("parseSemver: handles tags with extra suffix", () => {
  const result = parseSemver("v1.0.0-beta");
  assertEquals(result, { major: 1, minor: 0, patch: 0 });
});

// ─── compareVersionTags ──────────────────────────────────────────────────────

Deno.test("compareVersionTags: equal versions return 0", () => {
  assertEquals(compareVersionTags("v1.0.0", "v1.0.0"), 0);
  assertEquals(compareVersionTags("1.0.0", "v1.0.0"), 0);
});

Deno.test("compareVersionTags: major version comparison", () => {
  assert(compareVersionTags("v2.0.0", "v1.0.0") > 0);
  assert(compareVersionTags("v1.0.0", "v2.0.0") < 0);
});

Deno.test("compareVersionTags: minor version comparison", () => {
  assert(compareVersionTags("v0.3.0", "v0.2.0") > 0);
  assert(compareVersionTags("v0.2.0", "v0.3.0") < 0);
});

Deno.test("compareVersionTags: patch version comparison", () => {
  assert(compareVersionTags("v0.2.16", "v0.2.15") > 0);
  assert(compareVersionTags("v0.2.15", "v0.2.16") < 0);
});

Deno.test("compareVersionTags: real-world range v0.2.16 < v0.3.3", () => {
  assert(compareVersionTags("v0.2.16", "v0.3.3") < 0);
});

Deno.test("compareVersionTags: invalid tags sort after valid tags", () => {
  assert(compareVersionTags("invalid", "v1.0.0") > 0);
  assert(compareVersionTags("v1.0.0", "invalid") < 0);
  assertEquals(compareVersionTags("invalid", "also-invalid"), 0);
});

// ─── normalizeVersionTag ─────────────────────────────────────────────────────

Deno.test("normalizeVersionTag: adds v prefix when missing", () => {
  assertEquals(normalizeVersionTag("0.3.3"), "v0.3.3");
});

Deno.test("normalizeVersionTag: keeps existing v prefix", () => {
  assertEquals(normalizeVersionTag("v0.3.3"), "v0.3.3");
});

// ─── formatChangelogPlainText ────────────────────────────────────────────────

Deno.test("formatChangelogPlainText: formats releases newest first", () => {
  const range: ChangelogRange = {
    from: "v0.2.0",
    to: "v0.3.0",
    releases: [
      {
        tag: "v0.2.1",
        name: "v0.2.1",
        body: "Bug fixes",
        publishedAt: "2026-01-01T00:00:00Z",
        htmlUrl:
          "https://github.com/greghavens/triggerfish/releases/tag/v0.2.1",
      },
      {
        tag: "v0.3.0",
        name: "v0.3.0",
        body: "New features",
        publishedAt: "2026-02-01T00:00:00Z",
        htmlUrl:
          "https://github.com/greghavens/triggerfish/releases/tag/v0.3.0",
      },
    ],
  };
  const result = formatChangelogPlainText(range);
  // Newest first
  const v030Idx = result.indexOf("v0.3.0");
  const v021Idx = result.indexOf("v0.2.1");
  assert(v030Idx < v021Idx, "v0.3.0 should appear before v0.2.1");
  assert(result.includes("New features"));
  assert(result.includes("Bug fixes"));
  assert(result.includes("2026-02-01"));
});

Deno.test("formatChangelogPlainText: empty range returns informative message", () => {
  const range: ChangelogRange = {
    from: "v1.0.0",
    to: "v2.0.0",
    releases: [],
  };
  const result = formatChangelogPlainText(range);
  assert(result.includes("No releases found"));
  assert(result.includes("v1.0.0"));
  assert(result.includes("v2.0.0"));
});

Deno.test("formatChangelogPlainText: handles empty body", () => {
  const range: ChangelogRange = {
    from: "v0.1.0",
    to: "v0.2.0",
    releases: [
      {
        tag: "v0.2.0",
        name: "v0.2.0",
        body: "",
        publishedAt: "2026-01-01T00:00:00Z",
        htmlUrl: "",
      },
    ],
  };
  const result = formatChangelogPlainText(range);
  assert(result.includes("(no release notes)"));
});

// ─── formatChangelogMarkdown ─────────────────────────────────────────────────

Deno.test("formatChangelogMarkdown: formats with h3 headers", () => {
  const range: ChangelogRange = {
    from: "v0.1.0",
    to: "v0.2.0",
    releases: [
      {
        tag: "v0.2.0",
        name: "Big Release",
        body: "## Changes\n- Feature A",
        publishedAt: "2026-01-15T12:00:00Z",
        htmlUrl: "",
      },
    ],
  };
  const result = formatChangelogMarkdown(range);
  assert(result.includes("### v0.2.0: Big Release"));
  assert(result.includes("2026-01-15"));
  assert(result.includes("Feature A"));
});

Deno.test("formatChangelogMarkdown: uses tag as title when name matches tag", () => {
  const range: ChangelogRange = {
    from: "v0.1.0",
    to: "v0.2.0",
    releases: [
      {
        tag: "v0.2.0",
        name: "v0.2.0",
        body: "Changes",
        publishedAt: "",
        htmlUrl: "",
      },
    ],
  };
  const result = formatChangelogMarkdown(range);
  assert(result.includes("### v0.2.0"));
  // Should NOT have "v0.2.0: v0.2.0"
  assert(!result.includes("v0.2.0: v0.2.0"));
});

// ─── formatChangelogConcatenated ─────────────────────────────────────────────

Deno.test("formatChangelogConcatenated: concatenates non-empty bodies", () => {
  const range: ChangelogRange = {
    from: "v0.1.0",
    to: "v0.3.0",
    releases: [
      {
        tag: "v0.2.0",
        name: "v0.2.0",
        body: "First release",
        publishedAt: "",
        htmlUrl: "",
      },
      {
        tag: "v0.3.0",
        name: "v0.3.0",
        body: "Second release",
        publishedAt: "",
        htmlUrl: "",
      },
    ],
  };
  const result = formatChangelogConcatenated(range);
  assert(result.includes("[v0.3.0]"));
  assert(result.includes("[v0.2.0]"));
  assert(result.includes("First release"));
  assert(result.includes("Second release"));
});

Deno.test("formatChangelogConcatenated: skips releases with empty bodies", () => {
  const range: ChangelogRange = {
    from: "v0.1.0",
    to: "v0.3.0",
    releases: [
      {
        tag: "v0.2.0",
        name: "v0.2.0",
        body: "",
        publishedAt: "",
        htmlUrl: "",
      },
      {
        tag: "v0.3.0",
        name: "v0.3.0",
        body: "Has content",
        publishedAt: "",
        htmlUrl: "",
      },
    ],
  };
  const result = formatChangelogConcatenated(range);
  assert(!result.includes("[v0.2.0]"));
  assert(result.includes("[v0.3.0]"));
});

// ─── CLI command parsing ─────────────────────────────────────────────────────

Deno.test("CLI: parses 'changelog' command", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["changelog"]);
  assertEquals(cmd.command, "changelog");
});

Deno.test("CLI: parses 'changelog' with one version arg", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["changelog", "v0.2.16"]);
  assertEquals(cmd.command, "changelog");
  assertEquals(cmd.subcommand, "v0.2.16");
});

Deno.test("CLI: parses 'changelog' with two version args", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["changelog", "v0.2.16", "v0.3.3"]);
  assertEquals(cmd.command, "changelog");
  assertEquals(cmd.subcommand, "v0.2.16");
  assertEquals(cmd.flags.changelog_to, "v0.3.3");
});

Deno.test("CLI: parses 'changelog' with --latest flag", async () => {
  const { parseCommand } = await import("../../src/cli/main.ts");
  const cmd = parseCommand(["changelog", "--latest=5"]);
  assertEquals(cmd.command, "changelog");
  assertEquals(cmd.flags.latest, "5");
});
