/**
 * Tests for centralized channel access control in handleChannelMessage.
 *
 * Verifies the unified access control gate: pairing and classification
 * are a single decision — "does this user have a classification?" Pairing
 * is one way to get a classification (alongside static config).
 */
import { assertEquals, assert } from "@std/assert";
import { createChatSession } from "../../src/gateway/chat.ts";
import type { ChannelRegistrationConfig } from "../../src/gateway/chat.ts";
import type { ChannelAdapter, ChannelMessage, ChannelStatus, MessageHandler } from "../../src/channels/types.ts";
import type { ClassificationLevel, Result } from "../../src/core/types/classification.ts";
import { createProviderRegistry } from "../../src/agent/llm.ts";
import type { LlmProvider } from "../../src/agent/llm.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import { createHookRunner } from "../../src/core/policy/hooks.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";
import type { PairingService, PairingCode, PairingResult } from "../../src/channels/pairing.ts";

/** Create a mock adapter that records send calls. */
function createMockAdapter(cls: ClassificationLevel = "PUBLIC"): {
  adapter: ChannelAdapter;
  sent: ChannelMessage[];
  typingSent: string[];
} {
  const sent: ChannelMessage[] = [];
  const typingSent: string[] = [];

  const adapter: ChannelAdapter = {
    classification: cls,
    isOwner: false,
    async connect() {},
    async disconnect() {},
    async send(msg: ChannelMessage) {
      sent.push(msg);
    },
    onMessage(_handler: MessageHandler) {},
    status(): ChannelStatus {
      return { connected: true, channelType: "test" };
    },
    async sendTyping(sessionId: string) {
      typingSent.push(sessionId);
    },
  };

  return { adapter, sent, typingSent };
}

/** Create a mock LLM provider that returns a fixed response. */
function createMockProvider(): LlmProvider {
  return {
    name: "mock",
    supportsStreaming: false,
    async complete() {
      return {
        content: "Mock response",
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}

/** Create a mock pairing service. */
function createMockPairingService(opts?: {
  linkedUsers?: string[];
  verifyResult?: Result<PairingResult, string>;
}): PairingService {
  const linked = opts?.linkedUsers ?? [];
  const verifyResult = opts?.verifyResult ?? { ok: false, error: "Invalid" } as Result<PairingResult, string>;

  return {
    async generateCode(_channelType: string): Promise<PairingCode> {
      return { code: "123456", channelType: _channelType, expiresAt: new Date(Date.now() + 300000), used: false };
    },
    async verifyCode(
      _code: string,
      _channelType: string,
      _platformUserId: string,
    ): Promise<Result<PairingResult, string>> {
      return verifyResult;
    },
    async getPending(_channelType: string): Promise<PairingCode | null> {
      return null;
    },
    async getLinkedUsers(_channelType: string): Promise<string[]> {
      return linked;
    },
  };
}

/** Create a minimal ChatSession for testing access control gates. */
function createTestSession(opts?: {
  pairingService?: PairingService;
}) {
  const registry = createProviderRegistry();
  registry.register(createMockProvider());
  registry.setDefault("mock");

  const engine = createPolicyEngine();
  const hookRunner = createHookRunner(engine);

  const session = createSession({
    userId: "owner" as UserId,
    channelId: "test" as ChannelId,
  });

  return createChatSession({
    hookRunner,
    providerRegistry: registry,
    session,
    pairingService: opts?.pairingService,
  });
}

// --- Test 1: Owner bypass ---

Deno.test("Access control: owner messages bypass all gates", async () => {
  const pairingService = createMockPairingService({ linkedUsers: [] });
  const chatSession = createTestSession({ pairingService });
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("signal", {
    adapter,
    channelName: "Signal",
    classification: "PUBLIC" as ClassificationLevel,
    pairing: true,
    respondToUnclassified: false,
  });

  await chatSession.handleChannelMessage({
    content: "Hello from owner",
    sessionId: "signal-owner",
    isOwner: true,
  }, "signal");

  assert(sent.length > 0, "Owner messages should bypass all gates and get a response");
});

// --- Test 2: Config-classified user ---

Deno.test("Access control: config-classified user allowed", async () => {
  const chatSession = createTestSession();
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("telegram", {
    adapter,
    channelName: "Telegram",
    classification: "PUBLIC" as ClassificationLevel,
    respondToUnclassified: false,
    userClassifications: { "12345": "INTERNAL" },
  });

  await chatSession.handleChannelMessage({
    content: "Hello!",
    sessionId: "telegram-12345",
    senderId: "12345",
    isOwner: false,
  }, "telegram");

  assert(sent.length > 0, "Config-classified sender should get a response");
});

// --- Test 3: Unclassified + respondToUnclassified=false → dropped ---

Deno.test("Access control: unclassified + respondToUnclassified=false drops sender", async () => {
  const chatSession = createTestSession();
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("telegram", {
    adapter,
    channelName: "Telegram",
    classification: "PUBLIC" as ClassificationLevel,
    respondToUnclassified: false,
  });

  await chatSession.handleChannelMessage({
    content: "Hello!",
    sessionId: "telegram-12345",
    senderId: "12345",
    isOwner: false,
  }, "telegram");

  assertEquals(sent.length, 0, "Unclassified sender should be silently dropped");
});

// --- Test 4: Unclassified + respondToUnclassified=true → allowed ---

Deno.test("Access control: unclassified + respondToUnclassified=true allows sender", async () => {
  const chatSession = createTestSession();
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("telegram", {
    adapter,
    channelName: "Telegram",
    classification: "PUBLIC" as ClassificationLevel,
    // respondToUnclassified defaults to true
  });

  await chatSession.handleChannelMessage({
    content: "Hello!",
    sessionId: "telegram-12345",
    senderId: "12345",
    isOwner: false,
  }, "telegram");

  assert(sent.length > 0, "Unclassified sender should get a response when respondToUnclassified=true");
});

// --- Test 5: Pairing enabled + unpaired + non-code msg → dropped ---

Deno.test("Access control: pairing enabled, unpaired sender with non-code msg dropped", async () => {
  const pairingService = createMockPairingService({ linkedUsers: [] });
  const chatSession = createTestSession({ pairingService });
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("signal", {
    adapter,
    channelName: "Signal",
    classification: "PUBLIC" as ClassificationLevel,
    pairing: true,
  });

  await chatSession.handleChannelMessage({
    content: "Hello!",
    sessionId: "signal-+15559876543",
    senderId: "+15559876543",
    isOwner: false,
  }, "signal");

  assertEquals(sent.length, 0, "Unpaired sender with non-code msg should be dropped");
});

// --- Test 6: Pairing enabled + valid 6-digit code → confirms + adds classification ---

Deno.test("Access control: valid 6-digit code pairs and confirms", async () => {
  const pairingService = createMockPairingService({
    linkedUsers: [],
    verifyResult: {
      ok: true,
      value: {
        channelType: "signal",
        platformUserId: "+15559876543",
        linkedAt: new Date(),
      },
    },
  });
  const chatSession = createTestSession({ pairingService });
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("signal", {
    adapter,
    channelName: "Signal",
    classification: "PUBLIC" as ClassificationLevel,
    pairing: true,
  });

  // Send a 6-digit code as DM
  await chatSession.handleChannelMessage({
    content: "123456",
    sessionId: "signal-+15559876543",
    senderId: "+15559876543",
    isOwner: false,
  }, "signal");

  assertEquals(sent.length, 1, "Should send pairing confirmation");
  assert(sent[0].content.includes("Paired successfully"), "Confirmation message");
});

// --- Test 7: Pairing enabled + invalid code → silent drop ---

Deno.test("Access control: invalid pairing code stays silent", async () => {
  const pairingService = createMockPairingService({
    linkedUsers: [],
    verifyResult: { ok: false, error: "Invalid pairing code" },
  });
  const chatSession = createTestSession({ pairingService });
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("signal", {
    adapter,
    channelName: "Signal",
    classification: "PUBLIC" as ClassificationLevel,
    pairing: true,
  });

  await chatSession.handleChannelMessage({
    content: "999999",
    sessionId: "signal-+15559876543",
    senderId: "+15559876543",
    isOwner: false,
  }, "signal");

  assertEquals(sent.length, 0, "Invalid code should stay silent");
});

// --- Test 8: Pairing enabled + group msg with 6-digit → no code check, dropped ---

Deno.test("Access control: group message from unpaired sender dropped, no code check", async () => {
  const pairingService = createMockPairingService({ linkedUsers: [] });
  const chatSession = createTestSession({ pairingService });
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("signal", {
    adapter,
    channelName: "Signal",
    classification: "PUBLIC" as ClassificationLevel,
    pairing: true,
  });

  // Group messages don't attempt code verification even with 6-digit content
  await chatSession.handleChannelMessage({
    content: "123456",
    sessionId: "signal-group-abc123",
    senderId: "+15559876543",
    isOwner: false,
  }, "signal");

  assertEquals(sent.length, 0, "Group message from unpaired sender should be silently dropped");
});

// --- Test 9: Pre-paired user (from storage) → allowed with pairing classification ---

Deno.test("Access control: pre-paired user from storage is allowed", async () => {
  const pairingService = createMockPairingService({
    linkedUsers: ["+15559876543"],
  });
  const chatSession = createTestSession({ pairingService });
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("signal", {
    adapter,
    channelName: "Signal",
    classification: "PUBLIC" as ClassificationLevel,
    pairing: true,
  });

  await chatSession.handleChannelMessage({
    content: "Hello!",
    sessionId: "signal-+15559876543",
    senderId: "+15559876543",
    isOwner: false,
  }, "signal");

  assert(sent.length > 0, "Pre-paired sender should get a response");
});

// --- Test 10: Pre-paired + respondToUnclassified=false → allowed (the critical bug fix) ---

Deno.test("Access control: pre-paired user allowed even with respondToUnclassified=false", async () => {
  const pairingService = createMockPairingService({
    linkedUsers: ["+15559876543"],
  });
  const chatSession = createTestSession({ pairingService });
  const { adapter, sent } = createMockAdapter();

  await chatSession.registerChannel("signal", {
    adapter,
    channelName: "Signal",
    classification: "PUBLIC" as ClassificationLevel,
    pairing: true,
    respondToUnclassified: false,
  });

  await chatSession.handleChannelMessage({
    content: "Hello!",
    sessionId: "signal-+15559876543",
    senderId: "+15559876543",
    isOwner: false,
  }, "signal");

  assert(sent.length > 0, "Pre-paired user must be allowed even when respondToUnclassified=false");
});

// --- Test 11: sendTyping integration ---

Deno.test("Access control: sendTyping called on adapter during processing", async () => {
  const chatSession = createTestSession();
  const { adapter, typingSent } = createMockAdapter();

  await chatSession.registerChannel("telegram", {
    adapter,
    channelName: "Telegram",
    classification: "PUBLIC" as ClassificationLevel,
  });

  await chatSession.handleChannelMessage({
    content: "Hello!",
    sessionId: "telegram-12345",
    senderId: "12345",
    isOwner: false,
  }, "telegram");

  assert(typingSent.length > 0, "sendTyping should be called on the adapter during LLM processing");
});
