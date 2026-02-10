/**
 * Tests for channel pairing service.
 *
 * Validates pairing code generation, expiry, verification,
 * and reuse prevention.
 *
 * @module
 */

import { assertEquals, assertExists } from "@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createPairingService } from "../../src/channels/pairing.ts";
import type { PairingService } from "../../src/channels/pairing.ts";
import type { StorageProvider } from "../../src/core/storage/provider.ts";

/** Helper to create a service with a controllable clock. */
function setup(): {
  service: PairingService;
  storage: StorageProvider;
  clock: { now: number; advance: (ms: number) => void };
} {
  const storage = createMemoryStorage();
  const clock = {
    now: Date.now(),
    advance(ms: number) {
      this.now += ms;
    },
  };
  const service = createPairingService(storage, {
    now: () => clock.now,
  });
  return { service, storage, clock };
}

Deno.test("generateCode returns a 6-digit string", async () => {
  const { service } = setup();
  const code = await service.generateCode("telegram");

  assertEquals(code.code.length, 6);
  assertEquals(/^\d{6}$/.test(code.code), true);
  assertEquals(code.channelType, "telegram");
  assertEquals(code.used, false);
});

Deno.test("generateCode sets 5-minute expiry", async () => {
  const { service, clock } = setup();
  const code = await service.generateCode("telegram");

  const expectedExpiry = clock.now + 5 * 60 * 1000;
  assertEquals(code.expiresAt.getTime(), expectedExpiry);
});

Deno.test("code expires after 5 minutes", async () => {
  const { service, clock } = setup();
  const code = await service.generateCode("telegram");

  // Advance clock past expiry.
  clock.advance(5 * 60 * 1000 + 1);

  const result = await service.verifyCode(
    code.code,
    "telegram",
    "user123",
  );

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "Pairing code expired");
  }
});

Deno.test("getPending returns null for expired code", async () => {
  const { service, clock } = setup();
  await service.generateCode("slack");

  // Advance clock past expiry.
  clock.advance(5 * 60 * 1000 + 1);

  const pending = await service.getPending("slack");
  assertEquals(pending, null);
});

Deno.test("successful verification links identity", async () => {
  const { service } = setup();
  const code = await service.generateCode("whatsapp");

  const result = await service.verifyCode(
    code.code,
    "whatsapp",
    "user456",
  );

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.channelType, "whatsapp");
    assertEquals(result.value.platformUserId, "user456");
    assertExists(result.value.linkedAt);
  }
});

Deno.test("used code cannot be reused", async () => {
  const { service } = setup();
  const code = await service.generateCode("discord");

  // First verification succeeds.
  const first = await service.verifyCode(
    code.code,
    "discord",
    "user789",
  );
  assertEquals(first.ok, true);

  // Second verification fails.
  const second = await service.verifyCode(
    code.code,
    "discord",
    "other_user",
  );
  assertEquals(second.ok, false);
  if (!second.ok) {
    assertEquals(second.error, "Pairing code already used");
  }
});

Deno.test("wrong code returns error", async () => {
  const { service } = setup();
  await service.generateCode("telegram");

  const result = await service.verifyCode(
    "000000",
    "telegram",
    "user123",
  );

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "Invalid pairing code");
  }
});

Deno.test("wrong channel type returns error", async () => {
  const { service } = setup();
  const code = await service.generateCode("telegram");

  // Try to verify with a different channel type — code stored under telegram,
  // so looking it up under slack yields no result.
  const result = await service.verifyCode(
    code.code,
    "slack",
    "user123",
  );

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "Invalid pairing code");
  }
});

Deno.test("getPending returns active code", async () => {
  const { service } = setup();
  const code = await service.generateCode("email");

  const pending = await service.getPending("email");
  assertExists(pending);
  assertEquals(pending.code, code.code);
  assertEquals(pending.channelType, "email");
  assertEquals(pending.used, false);
});

Deno.test("getPending returns null after code is used", async () => {
  const { service } = setup();
  const code = await service.generateCode("telegram");

  await service.verifyCode(code.code, "telegram", "user999");

  const pending = await service.getPending("telegram");
  assertEquals(pending, null);
});

Deno.test("getPending returns null for unknown channel type", async () => {
  const { service } = setup();

  const pending = await service.getPending("nonexistent");
  assertEquals(pending, null);
});

Deno.test("generating new code replaces pending for same channel", async () => {
  const { service } = setup();

  const first = await service.generateCode("telegram");
  const second = await service.generateCode("telegram");

  // The pending code should be the second one.
  const pending = await service.getPending("telegram");
  assertExists(pending);
  assertEquals(pending.code, second.code);

  // The first code should still be verifiable (it's still in storage, not expired).
  const result = await service.verifyCode(first.code, "telegram", "user1");
  assertEquals(result.ok, true);
});
