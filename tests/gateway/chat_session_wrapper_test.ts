/**
 * Tests that wrapChatSessionForGateway and wrapChatSessionForTidepool
 * preserve live getter delegation for sessionTaint and workspacePath.
 *
 * Regression test: spread operator (`{ ...chatSession }`) evaluates
 * getters at spread time, freezing dynamic values like sessionTaint
 * to their initial value (PUBLIC). The wrappers must re-declare getters
 * so reconnecting clients see the current taint.
 */

import { assertEquals } from "@std/assert";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import type { ChatSessionConfig } from "../../src/gateway/chat_types.ts";
import { createChatSession } from "../../src/gateway/chat.ts";
import { createSession } from "../../src/core/types/session.ts";
import type { ChannelId, UserId } from "../../src/core/types/session.ts";
import type {
  LlmProvider,
  LlmProviderRegistry,
} from "../../src/core/types/llm.ts";
import { createHookRunner } from "../../src/core/policy/hooks/hooks.ts";
import type { PolicyRule } from "../../src/core/types/policy.ts";
import type { MainSessionState } from "../../src/gateway/startup/tools/tool_executor.ts";
import {
  wrapChatSessionForGateway,
  wrapChatSessionForTidepool,
} from "../../src/gateway/startup/services/chat_session.ts";

// ─── Stubs ───────────────────────────────────────────────────────────

function createStubProvider(): LlmProvider {
  return {
    name: "stub",
    // deno-lint-ignore require-await
    async generate() {
      return { content: "ok", usage: { inputTokens: 1, outputTokens: 1 } };
    },
    async *stream() {
      yield { type: "text" as const, text: "ok" };
    },
  };
}

function createStubRegistry(): LlmProviderRegistry {
  const p = createStubProvider();
  return {
    register() {},
    get() {
      return p;
    },
    getDefault() {
      return p;
    },
    list() {
      return ["stub"];
    },
  };
}

interface MutableTaintState {
  taint: ClassificationLevel;
}

interface BuildOptions {
  readonly getWorkspacePath?: () => string | null;
}

function buildTestChatSession(
  taintState: MutableTaintState,
  opts?: BuildOptions,
) {
  const session = createSession({
    userId: "owner" as UserId,
    channelId: "test" as ChannelId,
  });
  const config: ChatSessionConfig = {
    hookRunner: createHookRunner([] as PolicyRule[]),
    providerRegistry: createStubRegistry(),
    session,
    getSessionTaint: () => taintState.taint,
    escalateTaint: (level: ClassificationLevel) => {
      taintState.taint = level;
    },
    workspacePath: "/workspace/public",
    getWorkspacePath: opts?.getWorkspacePath,
  };
  return createChatSession(config);
}

function buildStubMainSessionState(): {
  state: MainSessionState;
  cliSecretPrompt: () => Promise<string | null>;
  cliCredentialPrompt: () => Promise<
    {
      username: string;
      password: string;
    } | null
  >;
} {
  const session = createSession({
    userId: "owner" as UserId,
    channelId: "daemon" as ChannelId,
  });
  return {
    state: {
      session,
      activeSecretPrompt: () => Promise.resolve(null),
      activeCredentialPrompt: () => Promise.resolve(null),
    } as MainSessionState,
    cliSecretPrompt: () => Promise.resolve(null),
    cliCredentialPrompt: () => Promise.resolve(null),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

Deno.test(
  "wrapChatSessionForGateway: sessionTaint delegates to live getter",
  () => {
    const taintState: MutableTaintState = {
      taint: "PUBLIC" as ClassificationLevel,
    };
    const chatSession = buildTestChatSession(taintState);
    const { state, cliSecretPrompt, cliCredentialPrompt } =
      buildStubMainSessionState();

    const wrapped = wrapChatSessionForGateway(
      chatSession,
      state,
      cliSecretPrompt,
      cliCredentialPrompt,
    );

    assertEquals(wrapped.sessionTaint, "PUBLIC");

    // Simulate taint escalation at the source
    taintState.taint = "CONFIDENTIAL" as ClassificationLevel;

    assertEquals(
      wrapped.sessionTaint,
      "CONFIDENTIAL",
      "Gateway wrapper must delegate sessionTaint to live getter",
    );
  },
);

Deno.test(
  "wrapChatSessionForTidepool: sessionTaint delegates to live getter",
  () => {
    const taintState: MutableTaintState = {
      taint: "PUBLIC" as ClassificationLevel,
    };
    const chatSession = buildTestChatSession(taintState);
    const { state, cliSecretPrompt, cliCredentialPrompt } =
      buildStubMainSessionState();
    const isTidepoolCallRef = { value: false };

    const wrapped = wrapChatSessionForTidepool(
      chatSession,
      isTidepoolCallRef,
      state,
      cliSecretPrompt,
      cliCredentialPrompt,
    );

    assertEquals(wrapped.sessionTaint, "PUBLIC");

    taintState.taint = "RESTRICTED" as ClassificationLevel;

    assertEquals(
      wrapped.sessionTaint,
      "RESTRICTED",
      "Tidepool wrapper must delegate sessionTaint to live getter",
    );
  },
);

Deno.test(
  "wrapChatSessionForGateway: static properties also delegate correctly",
  () => {
    const taintState: MutableTaintState = {
      taint: "PUBLIC" as ClassificationLevel,
    };
    const chatSession = buildTestChatSession(taintState);
    const { state, cliSecretPrompt, cliCredentialPrompt } =
      buildStubMainSessionState();

    const wrapped = wrapChatSessionForGateway(
      chatSession,
      state,
      cliSecretPrompt,
      cliCredentialPrompt,
    );

    assertEquals(wrapped.providerName, chatSession.providerName);
    assertEquals(wrapped.modelName, chatSession.modelName);
    assertEquals(wrapped.workspacePath, chatSession.workspacePath);
  },
);

Deno.test(
  "workspacePath resolves dynamically from getWorkspacePath based on taint",
  () => {
    const taintState: MutableTaintState = {
      taint: "PUBLIC" as ClassificationLevel,
    };
    const paths: Record<ClassificationLevel, string> = {
      PUBLIC: "/workspace/public",
      INTERNAL: "/workspace/internal",
      CONFIDENTIAL: "/workspace/confidential",
      RESTRICTED: "/workspace/restricted",
    };
    const chatSession = buildTestChatSession(taintState, {
      getWorkspacePath: () => paths[taintState.taint],
    });

    assertEquals(chatSession.workspacePath, "/workspace/public");

    taintState.taint = "CONFIDENTIAL" as ClassificationLevel;

    assertEquals(
      chatSession.workspacePath,
      "/workspace/confidential",
      "workspacePath must resolve dynamically from getWorkspacePath",
    );
  },
);

Deno.test(
  "workspacePath falls back to static config when getWorkspacePath absent",
  () => {
    const taintState: MutableTaintState = {
      taint: "PUBLIC" as ClassificationLevel,
    };
    const chatSession = buildTestChatSession(taintState);

    assertEquals(
      chatSession.workspacePath,
      "/workspace/public",
      "workspacePath falls back to static config.workspacePath",
    );
  },
);
