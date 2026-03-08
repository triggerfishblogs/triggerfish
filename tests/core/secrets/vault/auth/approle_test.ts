/**
 * AppRole authentication SSRF protection tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createAppRoleAuth } from "../../../../../src/core/secrets/vault/auth/approle.ts";
import type { SsrfChecker } from "../../../../../src/core/security/safe_fetch.ts";

const allowAllSsrf: SsrfChecker = (hostname: string) =>
  Promise.resolve({ ok: true, value: hostname });

const blockAllSsrf: SsrfChecker = (hostname: string) =>
  Promise.resolve({
    ok: false,
    error: `SSRF blocked: ${hostname} resolves to private IP`,
  });

function withMockFetch(
  handler: (url: string, init?: RequestInit) => Response,
  fn: () => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    return Promise.resolve(handler(url, init));
  };
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.test("AppRoleAuth: SSRF blocks login to private IP", async () => {
  const auth = createAppRoleAuth(
    { roleId: "role-1", secretId: "secret-1" },
    "http://10.0.0.1:8200",
    undefined,
    blockAllSsrf,
  );

  const result = await auth.authenticate();
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("SSRF blocked"), true);
  }
});

Deno.test("AppRoleAuth: login succeeds with permissive SSRF checker", () =>
  withMockFetch(
    () =>
      jsonResponse({
        auth: {
          client_token: "s.abc123",
          accessor: "acc-1",
          policies: ["default"],
          token_policies: ["default"],
          lease_duration: 3600,
          renewable: true,
        },
      }),
    async () => {
      const auth = createAppRoleAuth(
        { roleId: "role-1", secretId: "secret-1" },
        "http://127.0.0.1:8200",
        undefined,
        allowAllSsrf,
      );

      const result = await auth.authenticate();
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.client_token, "s.abc123");
      }
    },
  ));
