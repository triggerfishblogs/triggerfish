/**
 * Tests for Triggerfish Cloud callback server.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { startCallbackServer } from "../../src/dive/cloud.ts";

Deno.test("Cloud: callback server receives key from query param", async () => {
  const ac = new AbortController();
  const server = startCallbackServer(ac.signal);

  try {
    const resp = await fetch(
      `http://127.0.0.1:${server.port}/callback?key=tf_test_callback_key`,
    );
    assertEquals(resp.status, 200);
    const html = await resp.text();
    assertStringIncludes(html, "setup complete");

    const key = await server.keyPromise;
    assertEquals(key, "tf_test_callback_key");
  } finally {
    ac.abort();
    server.close();
  }
});

Deno.test("Cloud: callback server returns 404 for non-callback paths", async () => {
  const ac = new AbortController();
  const server = startCallbackServer(ac.signal);

  try {
    const resp = await fetch(`http://127.0.0.1:${server.port}/other`);
    assertEquals(resp.status, 404);
    await resp.text();
  } finally {
    ac.abort();
    server.close();
  }
});

Deno.test("Cloud: callback server returns 404 when key param is missing", async () => {
  const ac = new AbortController();
  const server = startCallbackServer(ac.signal);

  try {
    const resp = await fetch(
      `http://127.0.0.1:${server.port}/callback`,
    );
    assertEquals(resp.status, 404);
    await resp.text();
  } finally {
    ac.abort();
    server.close();
  }
});

Deno.test("Cloud: callback server listens on random port", () => {
  const ac = new AbortController();
  const server = startCallbackServer(ac.signal);

  try {
    assertEquals(server.port > 0, true);
  } finally {
    ac.abort();
    server.close();
  }
});
