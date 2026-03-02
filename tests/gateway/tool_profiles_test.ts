/**
 * Tests for tool profiles — verifies that each context gets the
 * correct subset of tools and system prompt sections.
 */

import { assertEquals, assertNotEquals } from "@std/assert";
import {
  resolvePromptsForProfile,
  resolveToolsForProfile,
  TOOL_GROUP_PROMPTS,
  TOOL_GROUPS,
  TOOL_PROFILES,
} from "../../src/gateway/tools/agent_tools.ts";

// Helper: collect all tool names from a profile
function toolNamesFor(profile: string): Set<string> {
  const tools = resolveToolsForProfile(profile);
  return new Set(tools.map((t) => t.name));
}

// ─── Profile content tests ─────────────────────────────────────────────────

Deno.test("triggerSession profile excludes browser tools", () => {
  const names = toolNamesFor("triggerSession");
  const browserNames = TOOL_GROUPS.browser().map((t) => t.name);
  for (const name of browserNames) {
    assertEquals(
      names.has(name),
      false,
      `triggerSession should not have ${name}`,
    );
  }
});

Deno.test("triggerSession profile excludes tidepool tools", () => {
  const names = toolNamesFor("triggerSession");
  const tidepoolNames = TOOL_GROUPS.tidepool().map((t) => t.name);
  for (const name of tidepoolNames) {
    assertEquals(
      names.has(name),
      false,
      `triggerSession should not have ${name}`,
    );
  }
});

Deno.test("triggerSession profile excludes claude tools", () => {
  const names = toolNamesFor("triggerSession");
  const claudeNames = TOOL_GROUPS.claude().map((t) => t.name);
  for (const name of claudeNames) {
    assertEquals(
      names.has(name),
      false,
      `triggerSession should not have ${name}`,
    );
  }
});

Deno.test("triggerSession profile excludes session tools", () => {
  const names = toolNamesFor("triggerSession");
  const sessionNames = TOOL_GROUPS.sessions().map((t) => t.name);
  for (const name of sessionNames) {
    assertEquals(
      names.has(name),
      false,
      `triggerSession should not have ${name}`,
    );
  }
});

Deno.test("triggerSession profile excludes plan tools", () => {
  const names = toolNamesFor("triggerSession");
  const planNames = TOOL_GROUPS.plan().map((t) => t.name);
  for (const name of planNames) {
    assertEquals(
      names.has(name),
      false,
      `triggerSession should not have ${name}`,
    );
  }
});

Deno.test("triggerSession profile excludes image tools", () => {
  const names = toolNamesFor("triggerSession");
  const imageNames = TOOL_GROUPS.image().map((t) => t.name);
  for (const name of imageNames) {
    assertEquals(
      names.has(name),
      false,
      `triggerSession should not have ${name}`,
    );
  }
});

Deno.test("triggerSession profile excludes explore tools", () => {
  const names = toolNamesFor("triggerSession");
  const exploreNames = TOOL_GROUPS.explore().map((t) => t.name);
  for (const name of exploreNames) {
    assertEquals(
      names.has(name),
      false,
      `triggerSession should not have ${name}`,
    );
  }
});

Deno.test("triggerSession profile includes exec_file tools", () => {
  const names = toolNamesFor("triggerSession");
  const execFileNames = TOOL_GROUPS.exec_file().map((t) => t.name);
  for (const name of execFileNames) {
    assertEquals(names.has(name), true, `triggerSession should have ${name}`);
  }
});

Deno.test("triggerSession profile excludes run_command", () => {
  const names = toolNamesFor("triggerSession");
  assertEquals(
    names.has("run_command"),
    false,
    "triggerSession should not have run_command",
  );
});

Deno.test("triggerSession profile includes web tools", () => {
  const names = toolNamesFor("triggerSession");
  const webNames = TOOL_GROUPS.web().map((t) => t.name);
  for (const name of webNames) {
    assertEquals(names.has(name), true, `triggerSession should have ${name}`);
  }
});

Deno.test("cli profile excludes tidepool tools", () => {
  const names = toolNamesFor("cli");
  const tidepoolNames = TOOL_GROUPS.tidepool().map((t) => t.name);
  for (const name of tidepoolNames) {
    assertEquals(names.has(name), false, `cli should not have ${name}`);
  }
});

Deno.test("cli profile includes browser tools", () => {
  const names = toolNamesFor("cli");
  const browserNames = TOOL_GROUPS.browser().map((t) => t.name);
  for (const name of browserNames) {
    assertEquals(names.has(name), true, `cli should have ${name}`);
  }
});

Deno.test("cli profile includes run_command", () => {
  const names = toolNamesFor("cli");
  assertEquals(names.has("run_command"), true, "cli should have run_command");
});

Deno.test("tidepool profile includes tidepool tools", () => {
  const names = toolNamesFor("tidepool");
  const tidepoolNames = TOOL_GROUPS.tidepool().map((t) => t.name);
  for (const name of tidepoolNames) {
    assertEquals(names.has(name), true, `tidepool should have ${name}`);
  }
});

Deno.test("tidepool profile includes run_command", () => {
  const names = toolNamesFor("tidepool");
  assertEquals(
    names.has("run_command"),
    true,
    "tidepool should have run_command",
  );
});

Deno.test("tidepool profile is a superset of cli profile", () => {
  const tidepoolNames = toolNamesFor("tidepool");
  const cliNames = toolNamesFor("cli");
  for (const name of cliNames) {
    assertEquals(
      tidepoolNames.has(name),
      true,
      `tidepool should have cli tool ${name}`,
    );
  }
});

Deno.test("cli profile is a superset of triggerSession profile", () => {
  const cliNames = toolNamesFor("cli");
  const triggerNames = toolNamesFor("triggerSession");
  for (const name of triggerNames) {
    assertEquals(
      cliNames.has(name),
      true,
      `cli should have trigger tool ${name}`,
    );
  }
});

// ─── exec_file + exec_command = exec ────────────────────────────────────────

Deno.test("exec_file + exec_command = exec (combined)", () => {
  const fileNames = new Set(TOOL_GROUPS.exec_file().map((t) => t.name));
  const cmdNames = new Set(TOOL_GROUPS.exec_command().map((t) => t.name));
  const execNames = new Set(TOOL_GROUPS.exec().map((t) => t.name));

  const combined = new Set([...fileNames, ...cmdNames]);
  assertEquals(
    combined.size,
    execNames.size,
    "combined should match exec size",
  );
  for (const name of execNames) {
    assertEquals(combined.has(name), true, `combined should have ${name}`);
  }
});

Deno.test("exec_file does not include run_command", () => {
  const names = new Set(TOOL_GROUPS.exec_file().map((t) => t.name));
  assertEquals(
    names.has("run_command"),
    false,
    "exec_file should not have run_command",
  );
});

Deno.test("exec_command only includes run_command", () => {
  const tools = TOOL_GROUPS.exec_command();
  assertEquals(tools.length, 1, "exec_command should have exactly 1 tool");
  assertEquals(tools[0].name, "run_command");
});

// ─── run_command exclusion from restricted profiles ─────────────────────────

Deno.test("cronJob profile excludes run_command", () => {
  const names = toolNamesFor("cronJob");
  assertEquals(
    names.has("run_command"),
    false,
    "cronJob should not have run_command",
  );
});

Deno.test("subagent profile excludes run_command", () => {
  const names = toolNamesFor("subagent");
  assertEquals(
    names.has("run_command"),
    false,
    "subagent should not have run_command",
  );
});

// ─── Tool count sanity checks ──────────────────────────────────────────────

Deno.test("triggerSession has fewer tools than cli", () => {
  const trigger = resolveToolsForProfile("triggerSession");
  const cli = resolveToolsForProfile("cli");
  assertEquals(
    trigger.length < cli.length,
    true,
    `trigger (${trigger.length}) should be < cli (${cli.length})`,
  );
});

Deno.test("cli has fewer tools than tidepool", () => {
  const cli = resolveToolsForProfile("cli");
  const tidepool = resolveToolsForProfile("tidepool");
  assertEquals(
    cli.length < tidepool.length,
    true,
    `cli (${cli.length}) should be < tidepool (${tidepool.length})`,
  );
});

Deno.test("all profiles return non-empty tool lists", () => {
  for (const profileName of Object.keys(TOOL_PROFILES)) {
    const tools = resolveToolsForProfile(profileName);
    assertNotEquals(tools.length, 0, `${profileName} should have tools`);
  }
});

// ─── System prompt profile tests ───────────────────────────────────────────

Deno.test("triggerSession prompts exclude tidepool/plan/session/image/explore/claude/secrets prompts", () => {
  const prompts = resolvePromptsForProfile("triggerSession");
  const excluded = [
    TOOL_GROUP_PROMPTS.tidepool,
    TOOL_GROUP_PROMPTS.plan,
    TOOL_GROUP_PROMPTS.sessions,
    TOOL_GROUP_PROMPTS.image,
    TOOL_GROUP_PROMPTS.explore,
    TOOL_GROUP_PROMPTS.claude,
    TOOL_GROUP_PROMPTS.secrets,
  ];
  for (const prompt of excluded) {
    if (prompt) {
      assertEquals(
        prompts.includes(prompt),
        false,
        "triggerSession should not include excluded prompt",
      );
    }
  }
});

Deno.test("triggerSession prompts include web/todo/memory prompts", () => {
  const prompts = resolvePromptsForProfile("triggerSession");
  const included = [
    TOOL_GROUP_PROMPTS.web,
    TOOL_GROUP_PROMPTS.todo,
    TOOL_GROUP_PROMPTS.memory,
  ];
  for (const prompt of included) {
    if (prompt) {
      assertEquals(
        prompts.includes(prompt),
        true,
        "triggerSession should include expected prompt",
      );
    }
  }
});

Deno.test("cli prompts exclude tidepool prompt", () => {
  const prompts = resolvePromptsForProfile("cli");
  if (TOOL_GROUP_PROMPTS.tidepool) {
    assertEquals(
      prompts.includes(TOOL_GROUP_PROMPTS.tidepool),
      false,
      "cli should not include tidepool prompt",
    );
  }
});

Deno.test("tidepool prompts include tidepool prompt", () => {
  const prompts = resolvePromptsForProfile("tidepool");
  if (TOOL_GROUP_PROMPTS.tidepool) {
    assertEquals(
      prompts.includes(TOOL_GROUP_PROMPTS.tidepool),
      true,
      "tidepool should include tidepool prompt",
    );
  }
});

Deno.test("triggerSession has fewer prompts than cli", () => {
  const trigger = resolvePromptsForProfile("triggerSession");
  const cli = resolvePromptsForProfile("cli");
  assertEquals(
    trigger.length < cli.length,
    true,
    `trigger prompts (${trigger.length}) should be < cli prompts (${cli.length})`,
  );
});

// ─── Ad-hoc profile test ────────────────────────────────────────────────────

Deno.test("resolveToolsForProfile accepts ad-hoc group list", () => {
  const tools = resolveToolsForProfile(["exec_file", "todo"]);
  const names = new Set(tools.map((t) => t.name));
  // Should have exec_file tools
  const execFileNames = TOOL_GROUPS.exec_file().map((t) => t.name);
  for (const name of execFileNames) {
    assertEquals(
      names.has(name),
      true,
      `ad-hoc should have exec_file tool ${name}`,
    );
  }
  // Should have todo tools
  const todoNames = TOOL_GROUPS.todo().map((t) => t.name);
  for (const name of todoNames) {
    assertEquals(names.has(name), true, `ad-hoc should have todo tool ${name}`);
  }
  // Should NOT have browser tools
  const browserNames = TOOL_GROUPS.browser().map((t) => t.name);
  for (const name of browserNames) {
    assertEquals(
      names.has(name),
      false,
      `ad-hoc should not have browser tool ${name}`,
    );
  }
  // Should NOT have run_command
  assertEquals(
    names.has("run_command"),
    false,
    "ad-hoc should not have run_command",
  );
});

// ─── No duplicate tool names ────────────────────────────────────────────────

Deno.test("tidepool profile has no duplicate tool names", () => {
  const tools = resolveToolsForProfile("tidepool");
  const names = tools.map((t) => t.name);
  const unique = new Set(names);
  assertEquals(
    names.length,
    unique.size,
    "tidepool profile has duplicate tool names",
  );
});

Deno.test("cli profile has no duplicate tool names", () => {
  const tools = resolveToolsForProfile("cli");
  const names = tools.map((t) => t.name);
  const unique = new Set(names);
  assertEquals(
    names.length,
    unique.size,
    "cli profile has duplicate tool names",
  );
});
