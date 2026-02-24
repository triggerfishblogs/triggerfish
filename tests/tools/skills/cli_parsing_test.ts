/**
 * @module cli_parsing_test
 *
 * Tests for CLI skill subcommand parsing (skill search, install, publish, etc.).
 */
import { assertEquals } from "@std/assert";

Deno.test("parseCommand: skill search parses query", async () => {
  const { parseCommand } = await import(
    "../../../src/cli/main_commands.ts"
  );
  const result = parseCommand(["skill", "search", "weather"]);
  assertEquals(result.command, "skill");
  assertEquals(result.subcommand, "search");
  assertEquals(result.flags.query, "weather");
});

Deno.test("parseCommand: skill search handles multi-word query", async () => {
  const { parseCommand } = await import(
    "../../../src/cli/main_commands.ts"
  );
  const result = parseCommand(["skill", "search", "deep", "research"]);
  assertEquals(result.command, "skill");
  assertEquals(result.subcommand, "search");
  assertEquals(result.flags.query, "deep research");
});

Deno.test("parseCommand: skill install parses name", async () => {
  const { parseCommand } = await import(
    "../../../src/cli/main_commands.ts"
  );
  const result = parseCommand(["skill", "install", "weather"]);
  assertEquals(result.command, "skill");
  assertEquals(result.subcommand, "install");
  assertEquals(result.flags.skill_name, "weather");
});

Deno.test("parseCommand: skill publish parses path", async () => {
  const { parseCommand } = await import(
    "../../../src/cli/main_commands.ts"
  );
  const result = parseCommand(["skill", "publish", "./my-skill/SKILL.md"]);
  assertEquals(result.command, "skill");
  assertEquals(result.subcommand, "publish");
  assertEquals(result.flags.skill_path, "./my-skill/SKILL.md");
});

Deno.test("parseCommand: skill update parses optional name", async () => {
  const { parseCommand } = await import(
    "../../../src/cli/main_commands.ts"
  );
  const withName = parseCommand(["skill", "update", "weather"]);
  assertEquals(withName.command, "skill");
  assertEquals(withName.subcommand, "update");
  assertEquals(withName.flags.skill_name, "weather");

  const withoutName = parseCommand(["skill", "update"]);
  assertEquals(withoutName.command, "skill");
  assertEquals(withoutName.subcommand, "update");
  assertEquals(withoutName.flags.skill_name, undefined);
});

Deno.test("parseCommand: skill list parses correctly", async () => {
  const { parseCommand } = await import(
    "../../../src/cli/main_commands.ts"
  );
  const result = parseCommand(["skill", "list"]);
  assertEquals(result.command, "skill");
  assertEquals(result.subcommand, "list");
});

Deno.test("parseCommand: skill without subcommand", async () => {
  const { parseCommand } = await import(
    "../../../src/cli/main_commands.ts"
  );
  const result = parseCommand(["skill"]);
  assertEquals(result.command, "skill");
  assertEquals(result.subcommand, undefined);
});
