/**
 * @module WhatsApp adapter factory tests.
 *
 * Tests adapter creation, default/custom classification,
 * sendTyping absence, and onMessage handler registration.
 */
import { assertEquals } from "@std/assert";
import { createWhatsAppChannel } from "../../../src/channels/whatsapp/adapter.ts";

/** Base port for WhatsApp factory tests (each test offsets from this). */
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

Deno.test("WhatsApp: factory creates adapter with correct channel type", () => {
  const adapter = createWhatsAppChannel(buildTestConfig(0));
  assertEquals(adapter.status().channelType, "whatsapp");
  assertEquals(adapter.status().connected, false);
});

Deno.test("WhatsApp: defaults to PUBLIC classification", () => {
  const adapter = createWhatsAppChannel(buildTestConfig(1));
  assertEquals(adapter.classification, "PUBLIC");
});

Deno.test("WhatsApp: respects custom classification", () => {
  const adapter = createWhatsAppChannel({
    ...buildTestConfig(2),
    classification: "CONFIDENTIAL",
  });
  assertEquals(adapter.classification, "CONFIDENTIAL");
});

Deno.test("WhatsApp: sendTyping is not defined", () => {
  const adapter = createWhatsAppChannel(buildTestConfig(3));
  assertEquals(adapter.sendTyping, undefined);
});

Deno.test("WhatsApp: onMessage handler is registered without error", () => {
  const adapter = createWhatsAppChannel(buildTestConfig(4));
  let received = false;
  adapter.onMessage(() => {
    received = true;
  });
  assertEquals(received, false);
});
