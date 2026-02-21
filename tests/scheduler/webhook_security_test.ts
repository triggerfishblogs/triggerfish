/**
 * Tests for webhook HMAC-SHA256 signing and verification.
 */
import { assertEquals, assert } from "@std/assert";
import {
  signWebhook,
  verifyWebhookSignature,
} from "../../src/scheduler/webhooks/security.ts";

// ── Round-trip ──────────────────────────────────────────────────────

Deno.test("signWebhook + verifyWebhookSignature: round-trip succeeds", async () => {
  const secret = "my-webhook-secret";
  const payload = '{"event":"deploy","data":{"env":"production"}}';

  const signature = await signWebhook(secret, payload);
  const valid = await verifyWebhookSignature(secret, payload, signature);

  assertEquals(valid, true);
});

Deno.test("signWebhook: returns 64-char lowercase hex string", async () => {
  const sig = await signWebhook("secret", "payload");

  assertEquals(sig.length, 64, "SHA-256 hex digest should be 64 chars");
  assert(/^[0-9a-f]+$/.test(sig), "Should be lowercase hex only");
});

// ── Rejection cases ─────────────────────────────────────────────────

Deno.test("verifyWebhookSignature: rejects wrong signature", async () => {
  const secret = "correct-secret";
  const payload = '{"event":"push"}';

  const signature = await signWebhook(secret, payload);
  // Corrupt the signature
  const wrongSig = signature.slice(0, -4) + "ffff";

  const valid = await verifyWebhookSignature(secret, payload, wrongSig);
  assertEquals(valid, false);
});

Deno.test("verifyWebhookSignature: rejects wrong payload", async () => {
  const secret = "webhook-secret";
  const payload = '{"event":"push"}';

  const signature = await signWebhook(secret, payload);
  const valid = await verifyWebhookSignature(
    secret,
    '{"event":"push","tampered":true}',
    signature,
  );

  assertEquals(valid, false);
});

Deno.test("verifyWebhookSignature: rejects wrong secret", async () => {
  const payload = '{"event":"push"}';

  const signature = await signWebhook("correct-secret", payload);
  const valid = await verifyWebhookSignature(
    "wrong-secret",
    payload,
    signature,
  );

  assertEquals(valid, false);
});

Deno.test("verifyWebhookSignature: rejects completely different signature", async () => {
  const valid = await verifyWebhookSignature(
    "secret",
    "payload",
    "0000000000000000000000000000000000000000000000000000000000000000",
  );

  assertEquals(valid, false);
});

Deno.test("verifyWebhookSignature: rejects signature of wrong length", async () => {
  const valid = await verifyWebhookSignature(
    "secret",
    "payload",
    "abc123",
  );

  assertEquals(valid, false);
});
