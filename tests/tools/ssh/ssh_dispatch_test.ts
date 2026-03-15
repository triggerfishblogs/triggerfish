/**
 * Tests for SSH workflow dispatch integration.
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  isDispatchError,
  resolveCallDispatch,
} from "../../../src/workflow/dispatch.ts";
import { createWorkflowContext } from "../../../src/workflow/context.ts";

function makeCallTask(call: string, withInput: Record<string, unknown> = {}) {
  return { call, with: withInput } as Parameters<typeof resolveCallDispatch>[0];
}

function emptyContext() {
  return createWorkflowContext({});
}

Deno.test("triggerfish:ssh dispatches to ssh_execute by default", () => {
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:ssh", {
      host: "server.example.com",
      command: "uptime",
    }),
    emptyContext(),
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "ssh_execute");
    assertEquals(result.input.host, "server.example.com");
    assertEquals(result.input.command, "uptime");
  }
});

Deno.test("triggerfish:ssh with operation=execute dispatches to ssh_execute", () => {
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:ssh", {
      operation: "execute",
      host: "server.example.com",
      command: "df -h",
    }),
    emptyContext(),
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "ssh_execute");
  }
});

Deno.test("triggerfish:ssh with operation=session_open dispatches correctly", () => {
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:ssh", {
      operation: "session_open",
      host: "server.example.com",
    }),
    emptyContext(),
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "ssh_session_open");
    assertEquals(result.input.host, "server.example.com");
  }
});

Deno.test("triggerfish:ssh with operation=session_write dispatches correctly", () => {
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:ssh", {
      operation: "session_write",
      session_id: "abc123",
      input: "ls -la",
    }),
    emptyContext(),
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "ssh_session_write");
    assertEquals(result.input.session_id, "abc123");
    assertEquals(result.input.input, "ls -la");
  }
});

Deno.test("triggerfish:ssh with operation=session_read dispatches correctly", () => {
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:ssh", {
      operation: "session_read",
      session_id: "abc123",
    }),
    emptyContext(),
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "ssh_session_read");
  }
});

Deno.test("triggerfish:ssh with operation=session_close dispatches correctly", () => {
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:ssh", {
      operation: "session_close",
      session_id: "abc123",
    }),
    emptyContext(),
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "ssh_session_close");
  }
});

Deno.test("triggerfish:ssh with unknown operation returns error", () => {
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:ssh", {
      operation: "invalid",
      host: "server.example.com",
    }),
    emptyContext(),
  );
  assertEquals(isDispatchError(result), true);
  if (isDispatchError(result)) {
    assertEquals(result.error.includes("Unknown ssh operation"), true);
  }
});

Deno.test("triggerfish:ssh passes credential secret refs through", () => {
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:ssh", {
      host: "server.example.com",
      command: "whoami",
      port: 2222,
      key: "{{secret:prod_ssh_key}}",
      password: "{{secret:prod_ssh:password}}",
      passphrase: "{{secret:prod_key_passphrase}}",
    }),
    emptyContext(),
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.input.port, 2222);
    assertEquals(result.input.key, "{{secret:prod_ssh_key}}");
    assertEquals(result.input.password, "{{secret:prod_ssh:password}}");
    assertEquals(result.input.passphrase, "{{secret:prod_key_passphrase}}");
  }
});

Deno.test("triggerfish:ssh dispatch does not include identity_file", () => {
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:ssh", {
      host: "server.example.com",
      command: "ls",
    }),
    emptyContext(),
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.input.identity_file, undefined);
  }
});
