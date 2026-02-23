/**
 * MCP Manager — environment variable resolution and server adapter.
 *
 * Handles `keychain:` prefix expansion via SecretStore and bridges
 * McpClient to the gateway's McpServer interface.
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";
import type { SecretStore } from "../core/secrets/keychain/keychain.ts";
import type { McpClient } from "./client/protocol.ts";
import type { McpServer, McpServerToolResult } from "./gateway/gateway.ts";

// ─── Env resolution ──────────────────────────────────────────────────────────

/**
 * Resolve env var values, expanding `keychain:` prefixed values via SecretStore.
 *
 * Plain string values are passed through as-is. Values starting with `keychain:`
 * are looked up in the OS keychain. Failed lookups are skipped with a warning.
 */
export async function resolveEnvVars(
  env: Readonly<Record<string, string>>,
  secretStore?: SecretStore,
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    resolved[key] = await resolveOneEnvVar(key, value, secretStore);
  }
  return filterDefinedValues(resolved);
}

/** Resolve a single env var value, handling keychain: prefix. */
async function resolveOneEnvVar(
  key: string,
  value: string,
  secretStore?: SecretStore,
): Promise<string> {
  if (!value.startsWith("keychain:")) {
    return value;
  }
  if (!secretStore) {
    createLogger("mcp").warn(
      `env: keychain: prefix used for ${key} but no SecretStore available`,
    );
    return "";
  }
  const secretName = value.slice("keychain:".length);
  const result = await secretStore.getSecret(secretName);
  if (result.ok) {
    return result.value;
  }
  createLogger("mcp").warn(
    `env: could not resolve keychain secret '${secretName}' for ${key}: ${result.error}`,
  );
  return "";
}

/** Filter out entries with empty-string values (failed keychain lookups). */
function filterDefinedValues(
  record: Record<string, string>,
): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== "") {
      filtered[key] = value;
    }
  }
  return filtered;
}

// ─── Server adapter ──────────────────────────────────────────────────────────

/** Options for creating an MCP tool invocation. */
interface McpToolInvocation {
  readonly client: McpClient;
  readonly classification: ClassificationLevel | undefined;
  readonly name: string;
  readonly args: Record<string, unknown>;
}

/**
 * Create an McpServer adapter that bridges an McpClient to the gateway's
 * McpServer interface. Wraps callTool in try/catch to return Result.
 */
export function createMcpServerAdapter(
  client: McpClient,
  classification: ClassificationLevel | undefined,
): McpServer {
  return {
    callTool: (name: string, args: Record<string, unknown>) =>
      invokeMcpTool({ client, classification, name, args }),
  };
}

/** Invoke a tool on the MCP client and return a gateway-compatible Result. */
async function invokeMcpTool(
  invocation: McpToolInvocation,
): Promise<Result<McpServerToolResult, string>> {
  try {
    const result = await invocation.client.callTool(
      invocation.name,
      invocation.args,
    );
    return {
      ok: true,
      value: {
        content: extractTextContent(result.content),
        classification: invocation.classification ??
          ("PUBLIC" as ClassificationLevel),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `MCP tool call failed: ${message}` };
  }
}

/** Extract and join text parts from MCP tool result content. */
function extractTextContent(
  content: readonly { text?: string }[],
): string {
  const textParts: string[] = [];
  for (const item of content) {
    if (item.text) {
      textParts.push(item.text);
    }
  }
  return textParts.join("\n");
}
