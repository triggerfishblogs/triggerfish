/**
 * Browser, GitHub, MCP, and explore executor initialization.
 *
 * Builds browser domain policy, auto-launch browser executor,
 * GitHub client/executor, MCP server wiring, and explore executor.
 *
 * @module
 */

import { join } from "@std/path";
import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { TriggerFishConfig } from "../../../core/config.ts";
import type { createSession } from "../../../core/types/session.ts";
import { createSqliteStorage } from "../../../core/storage/sqlite.ts";
import {
  createAutoLaunchBrowserExecutor,
  createBrowserManager,
  createDomainPolicy as createBrowserDomainPolicy,
} from "../../../tools/browser/mod.ts";
import { createProviderRegistry } from "../../../agent/llm.ts";
import { resolveVisionProvider } from "../../../agent/providers/config.ts";
import {
  createGitHubClient,
  createGitHubToolExecutor,
  resolveGitHubToken,
} from "../../../integrations/github/mod.ts";
import { createKeychain } from "../../../core/secrets/keychain/keychain.ts";
import { createExploreToolExecutor } from "../../../tools/explore/mod.ts";
import type { createHookRunner } from "../../../core/policy/hooks/hooks.ts";
import { wireMcpServers } from "../infra/mcp.ts";
import type { McpBroadcastRefs } from "../infra/mcp.ts";
import { buildSubagentFactory } from "../factory/subagent.ts";

/** Build browser domain policy from web config. */
export function buildBrowserDomainPolicyFromConfig(config: TriggerFishConfig) {
  return createBrowserDomainPolicy({
    allowList: (config.web?.domains?.allowlist ?? []) as string[],
    denyList: (config.web?.domains?.denylist ?? []) as string[],
    classifications: Object.fromEntries(
      (config.web?.domains?.classifications ?? []).map((
        c,
      ) => [c.pattern, c.classification]),
    ),
  });
}

/** Create auto-launch browser executor with domain policy. */
export function initializeBrowserExecutor(
  config: TriggerFishConfig,
  dataDir: string,
  storage: ReturnType<typeof createSqliteStorage>,
  getSessionTaint: () => ClassificationLevel,
  visionProvider: ReturnType<typeof resolveVisionProvider>,
  primaryProvider: ReturnType<
    ReturnType<typeof createProviderRegistry>["getDefault"]
  >,
) {
  const browserDomainPolicy = buildBrowserDomainPolicyFromConfig(config);
  return createAutoLaunchBrowserExecutor({
    manager: createBrowserManager({
      profileBaseDir: join(dataDir, "browser-profiles"),
      domainPolicy: browserDomainPolicy,
      storage,
      headless: false,
    }),
    agentId: "main-session",
    getSessionTaint,
    visionProvider,
    primaryProvider,
  });
}

/** Build GitHub client configuration from config. */
export function buildGitHubClientConfig(
  config: TriggerFishConfig,
  token: string,
) {
  return {
    token,
    baseUrl: config.github?.base_url,
    classificationConfig: config.github?.classification_overrides
      ? {
        overrides: config.github.classification_overrides as Readonly<
          Record<string, ClassificationLevel>
        >,
      }
      : undefined,
  };
}

/** Resolve GitHub token and create the executor. */
export async function buildGitHubExecutor(
  config: TriggerFishConfig,
  session: ReturnType<typeof createSession>,
  opts?: { readonly workspacePath?: string },
) {
  const keychain = createKeychain();
  const tokenResult = await resolveGitHubToken({ secretStore: keychain });
  const executor = createGitHubToolExecutor(
    tokenResult.ok
      ? {
        client: createGitHubClient(
          buildGitHubClientConfig(config, tokenResult.value),
        ),
        sessionTaint: session.taint,
        sourceSessionId: session.id,
        workspacePath: opts?.workspacePath,
      }
      : undefined,
  );
  return { executor, keychain };
}

/** Connect MCP servers if configured (non-blocking background connection). */
export function initializeMcpServers(
  config: TriggerFishConfig,
  hookRunner: ReturnType<typeof createHookRunner>,
  getSession: () => ReturnType<typeof createSession>,
  toolClassifications: Map<string, ClassificationLevel>,
  integrationClassifications: Map<string, ClassificationLevel>,
  mcpBroadcastRefs: McpBroadcastRefs,
  keychain: ReturnType<typeof createKeychain>,
) {
  if (!config.mcp_servers || Object.keys(config.mcp_servers).length === 0) {
    return { mcpExecutor: undefined, mcpWiring: null };
  }
  const mcpWiring = wireMcpServers(
    config.mcp_servers,
    hookRunner,
    getSession,
    toolClassifications,
    integrationClassifications,
    mcpBroadcastRefs,
    keychain,
  );
  return { mcpExecutor: mcpWiring.executor, mcpWiring };
}

/** Build explore executor backed by a single subagent. */
export function buildExploreExecutor(
  subagentFactory: ReturnType<typeof buildSubagentFactory>,
) {
  return createExploreToolExecutor(subagentFactory);
}
