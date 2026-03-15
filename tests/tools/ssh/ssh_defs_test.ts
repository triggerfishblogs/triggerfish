/**
 * Tests for SSH tool definitions.
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  getSshToolDefinitions,
  SSH_SYSTEM_PROMPT,
} from "../../../src/tools/ssh/mod.ts";

Deno.test("getSshToolDefinitions returns five tools", () => {
  const defs = getSshToolDefinitions();
  assertEquals(defs.length, 5);
});

Deno.test("getSshToolDefinitions includes expected tool names", () => {
  const defs = getSshToolDefinitions();
  const names = defs.map((d) => d.name);
  assertEquals(names, [
    "ssh_execute",
    "ssh_session_open",
    "ssh_session_write",
    "ssh_session_read",
    "ssh_session_close",
  ]);
});

Deno.test("ssh_execute has required host and command parameters", () => {
  const defs = getSshToolDefinitions();
  const exec = defs.find((d) => d.name === "ssh_execute")!;
  assertEquals(exec.parameters.host.required, true);
  assertEquals(exec.parameters.command.required, true);
  assertEquals(exec.parameters.timeout_ms.required, undefined);
});

Deno.test("ssh_execute has key, password, passphrase parameters", () => {
  const defs = getSshToolDefinitions();
  const exec = defs.find((d) => d.name === "ssh_execute")!;
  assertEquals(exec.parameters.key.type, "string");
  assertEquals(exec.parameters.password.type, "string");
  assertEquals(exec.parameters.passphrase.type, "string");
});

Deno.test("ssh_execute has no identity_file parameter", () => {
  const defs = getSshToolDefinitions();
  const exec = defs.find((d) => d.name === "ssh_execute")!;
  assertEquals(exec.parameters.identity_file, undefined);
});

Deno.test("ssh_session_open has key, password, passphrase parameters", () => {
  const defs = getSshToolDefinitions();
  const open = defs.find((d) => d.name === "ssh_session_open")!;
  assertEquals(open.parameters.key.type, "string");
  assertEquals(open.parameters.password.type, "string");
  assertEquals(open.parameters.passphrase.type, "string");
});

Deno.test("ssh_session_open has no identity_file parameter", () => {
  const defs = getSshToolDefinitions();
  const open = defs.find((d) => d.name === "ssh_session_open")!;
  assertEquals(open.parameters.identity_file, undefined);
});

Deno.test("ssh_session_write has required parameters", () => {
  const defs = getSshToolDefinitions();
  const write = defs.find((d) => d.name === "ssh_session_write")!;
  assertEquals(write.parameters.session_id.required, true);
  assertEquals(write.parameters.input.required, true);
});

Deno.test("ssh_session_read has required session_id", () => {
  const defs = getSshToolDefinitions();
  const read = defs.find((d) => d.name === "ssh_session_read")!;
  assertEquals(read.parameters.session_id.required, true);
});

Deno.test("ssh_session_close has required session_id", () => {
  const defs = getSshToolDefinitions();
  const close = defs.find((d) => d.name === "ssh_session_close")!;
  assertEquals(close.parameters.session_id.required, true);
});

Deno.test("SSH_SYSTEM_PROMPT forbids filesystem access for credentials", () => {
  assertEquals(SSH_SYSTEM_PROMPT.includes("NEVER"), true);
  assertEquals(SSH_SYSTEM_PROMPT.includes("~/.ssh/"), true);
  assertEquals(SSH_SYSTEM_PROMPT.includes("secret_save"), true);
  assertEquals(SSH_SYSTEM_PROMPT.includes("{{secret:"), true);
});
