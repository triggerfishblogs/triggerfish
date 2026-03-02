/**
 * @module WhatsApp adapter lifecycle tests.
 *
 * Tests connect/disconnect behavior and status reporting.
 */
import { assertEquals } from "@std/assert";
import { createWhatsAppChannel } from "../../../src/channels/whatsapp/adapter.ts";

/** Base port for WhatsApp lifecycle tests (each test offsets from this). */
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
  name: "WhatsApp: connect starts server and status shows connected",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 30;
    const adapter = createWhatsAppChannel({
      ...buildTestConfig(30),
      webhookPort: port,
    });
    assertEquals(adapter.status().connected, false);
    await adapter.connect();
    try {
      assertEquals(adapter.status().connected, true);
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test({
  name: "WhatsApp: disconnect shuts down server and status shows disconnected",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 31;
    const adapter = createWhatsAppChannel({
      ...buildTestConfig(31),
      webhookPort: port,
    });
    await adapter.connect();
    assertEquals(adapter.status().connected, true);
    await adapter.disconnect();
    assertEquals(adapter.status().connected, false);
  },
});
