/**
 * Kubernetes authentication SSRF protection tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createKubernetesAuth } from "../../../../../src/core/secrets/vault/auth/kubernetes.ts";
import type { SsrfChecker } from "../../../../../src/core/security/safe_fetch.ts";

const blockAllSsrf: SsrfChecker = (hostname: string) =>
  Promise.resolve({
    ok: false,
    error: `SSRF blocked: ${hostname} resolves to private IP`,
  });

Deno.test("KubernetesAuth: SSRF blocks authenticate to private IP", async () => {
  const tmpFile = await Deno.makeTempFile();
  await Deno.writeTextFile(tmpFile, "mock-jwt-token");

  try {
    const auth = createKubernetesAuth(
      { role: "my-role", jwtPath: tmpFile },
      "http://10.0.0.1:8200",
      undefined,
      blockAllSsrf,
    );

    const result = await auth.authenticate();
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.includes("SSRF blocked"), true);
    }
  } finally {
    await Deno.remove(tmpFile);
  }
});
