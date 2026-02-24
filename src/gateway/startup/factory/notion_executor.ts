/**
 * Notion executor factory — builds the Notion tool executor at startup.
 *
 * Resolves the Notion token from the OS keychain, creates the HTTP client
 * and service layer, and returns a chain-compatible executor. Returns
 * undefined if Notion is not configured or the token is not found (lazy error).
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { TriggerFishConfig } from "../../../core/config.ts";
import type { SessionId } from "../../../core/types/session.ts";
import { parseClassification } from "../../../core/types/classification.ts";
import { createKeychain } from "../../../core/secrets/keychain/keychain.ts";
import {
  createNotionClient,
  createNotionPagesService,
  createNotionDatabasesService,
  createNotionBlocksService,
  createNotionToolExecutor,
  resolveNotionToken,
} from "../../../integrations/notion/mod.ts";

/**
 * Build the Notion tool executor from config and keychain.
 *
 * Returns undefined if Notion is disabled or the token is not found.
 * The executor handles graceful "not configured" errors at tool call time.
 */
export async function buildNotionExecutor(
  config: TriggerFishConfig,
  getSessionTaint: () => ClassificationLevel,
  sourceSessionId: SessionId,
): Promise<
  ((name: string, input: Record<string, unknown>) => Promise<string | null>) | undefined
> {
  if (config.notion?.enabled === false) {
    return undefined;
  }

  const keychain = createKeychain();
  const tokenResult = await resolveNotionToken({ secretStore: keychain });

  if (!tokenResult.ok) {
    // Token not found — return executor that gives a graceful error
    return createNotionToolExecutor(undefined);
  }

  const classificationFloor = resolveClassificationFloor(config);

  const client = createNotionClient({
    token: tokenResult.value,
    rateLimitPerSecond: config.notion?.rate_limit,
  });

  const pages = createNotionPagesService(client);
  const databases = createNotionDatabasesService(client);
  const blocks = createNotionBlocksService(client);

  return createNotionToolExecutor({
    pages,
    databases,
    blocks,
    sessionTaint: getSessionTaint,
    sourceSessionId,
    classificationFloor,
  });
}

/** Parse the classification floor from config if present. */
function resolveClassificationFloor(
  config: TriggerFishConfig,
): ClassificationLevel | undefined {
  const floor = config.notion?.classification_floor;
  if (!floor) return undefined;
  const parsed = parseClassification(floor);
  return parsed.ok ? parsed.value : undefined;
}
