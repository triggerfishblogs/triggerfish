/**
 * @module WhatsApp message dispatch tests.
 *
 * Tests text message dispatch, owner detection, non-owner taint,
 * no-ownerPhone fallback, non-text/empty-body skipping, and
 * send with missing sessionId.
 */
import { assertEquals } from "@std/assert";
import { createWhatsAppChannel } from "../../../src/channels/whatsapp/adapter.ts";
import type { ChannelMessage } from "../../../src/channels/types.ts";

/** Base port for WhatsApp dispatch tests (each test offsets from this). */
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

/** Build a Cloud API webhook payload containing one text message. */
function buildWebhookPayload(
  from: string,
  body: string,
  type = "text",
): Record<string, unknown> {
  return {
    object: "whatsapp_business_account",
    entry: [{
      id: "BIZ_ID",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "15550001111", phone_number_id: "123456789" },
          messages: [{
            from,
            id: "wamid.test123",
            timestamp: "1700000000",
            type,
            ...(type === "text" ? { text: { body } } : {}),
          }],
        },
        field: "messages",
      }],
    }],
  };
}

Deno.test({
  name: "WhatsApp: text message dispatches to handler with correct fields",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 20;
    const adapter = createWhatsAppChannel({ ...buildTestConfig(20), webhookPort: port });
    const received: ChannelMessage[] = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.connect();
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildWebhookPayload("15559876543", "Hello agent")),
      });
      assertEquals(resp.status, 200);
      await resp.body?.cancel();
      // Give the async handler a tick to process
      await new Promise((r) => setTimeout(r, 50));
      assertEquals(received.length, 1);
      assertEquals(received[0].content, "Hello agent");
      assertEquals(received[0].sessionId, "whatsapp-15559876543");
      assertEquals(received[0].senderId, "15559876543");
      assertEquals(received[0].isGroup, false);
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test({
  name: "WhatsApp: owner phone match sets isOwner true",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 21;
    const adapter = createWhatsAppChannel({
      ...buildTestConfig(21),
      webhookPort: port,
      ownerPhone: "15559876543",
    });
    const received: ChannelMessage[] = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.connect();
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildWebhookPayload("15559876543", "Owner msg")),
      });
      await resp.body?.cancel();
      await new Promise((r) => setTimeout(r, 50));
      assertEquals(received.length, 1);
      assertEquals(received[0].isOwner, true);
      assertEquals(received[0].sessionTaint, undefined);
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test({
  name: "WhatsApp: non-owner phone sets isOwner false with PUBLIC taint",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 22;
    const adapter = createWhatsAppChannel({
      ...buildTestConfig(22),
      webhookPort: port,
      ownerPhone: "15550000001",
    });
    const received: ChannelMessage[] = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.connect();
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildWebhookPayload("15559999999", "Stranger msg")),
      });
      await resp.body?.cancel();
      await new Promise((r) => setTimeout(r, 50));
      assertEquals(received.length, 1);
      assertEquals(received[0].isOwner, false);
      assertEquals(received[0].sessionTaint, "PUBLIC");
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test({
  name: "WhatsApp: no ownerPhone configured treats all as owner",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 23;
    const adapter = createWhatsAppChannel({
      ...buildTestConfig(23),
      webhookPort: port,
    });
    const received: ChannelMessage[] = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.connect();
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildWebhookPayload("15550009999", "Anyone msg")),
      });
      await resp.body?.cancel();
      await new Promise((r) => setTimeout(r, 50));
      assertEquals(received.length, 1);
      assertEquals(received[0].isOwner, true);
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test({
  name: "WhatsApp: non-text message type is skipped",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 24;
    const adapter = createWhatsAppChannel({ ...buildTestConfig(24), webhookPort: port });
    const received: ChannelMessage[] = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.connect();
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildWebhookPayload("15551111111", "", "image")),
      });
      await resp.body?.cancel();
      await new Promise((r) => setTimeout(r, 50));
      assertEquals(received.length, 0);
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test({
  name: "WhatsApp: empty text body is skipped",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const port = BASE_PORT + 25;
    const adapter = createWhatsAppChannel({ ...buildTestConfig(25), webhookPort: port });
    const received: ChannelMessage[] = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.connect();
    try {
      const payload = buildWebhookPayload("15551111111", "", "text");
      const resp = await fetch(`http://127.0.0.1:${port}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await resp.body?.cancel();
      await new Promise((r) => setTimeout(r, 50));
      assertEquals(received.length, 0);
    } finally {
      await adapter.disconnect();
    }
  },
});

Deno.test("WhatsApp: send with missing sessionId returns early", async () => {
  const adapter = createWhatsAppChannel(buildTestConfig(40));
  // Should not throw — returns early when sessionId is missing
  await adapter.send({ content: "test" });
});
