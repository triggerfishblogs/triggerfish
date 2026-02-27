/**
 * @module WhatsApp webhook verification tests.
 *
 * Tests GET webhook verification with correct token, wrong token,
 * missing parameters, and non-webhook paths.
 */
import { assertEquals } from "@std/assert";
import { createWhatsAppChannel } from "../../../src/channels/whatsapp/adapter.ts";

/** Base port for WhatsApp webhook tests (each test offsets from this). */
const BASE_PORT = 19_400;

/** Build a minimal WhatsApp config for testing. */
function buildTestConfig(portOffset: number) {
  return {
    accessToken: "test-access-token",
    phoneNumberId: "123456789",
    verifyToken: "test-verify-token",
    webhookPort: BASE_PORT + portOffset,
  };
}

Deno.test({
  name: "WhatsApp: webhook GET with correct token returns 200 + challenge",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 10;
    const adapter = createWhatsAppChannel({ ...buildTestConfig(10), webhookPort: port });
    await adapter.connect();
    try {
      const url = `http://127.0.0.1:${port}/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=test_challenge_123`;
      const resp = await fetch(url);
      assertEquals(resp.status, 200);
      const text = await resp.text();
      assertEquals(text, "test_challenge_123");
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test({
  name: "WhatsApp: webhook GET with wrong token returns 403",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 11;
    const adapter = createWhatsAppChannel({ ...buildTestConfig(11), webhookPort: port });
    await adapter.connect();
    try {
      const url = `http://127.0.0.1:${port}/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=abc`;
      const resp = await fetch(url);
      assertEquals(resp.status, 403);
      await resp.body?.cancel();
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test({
  name: "WhatsApp: webhook GET with missing parameters returns 403",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 12;
    const adapter = createWhatsAppChannel({ ...buildTestConfig(12), webhookPort: port });
    await adapter.connect();
    try {
      const url = `http://127.0.0.1:${port}/webhook`;
      const resp = await fetch(url);
      assertEquals(resp.status, 403);
      await resp.body?.cancel();
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test({
  name: "WhatsApp: non-webhook path returns 404",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 13;
    const adapter = createWhatsAppChannel({ ...buildTestConfig(13), webhookPort: port });
    await adapter.connect();
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/other`);
      assertEquals(resp.status, 404);
      await resp.body?.cancel();
    } finally {
      await adapter.disconnect();
    }
  },
});
