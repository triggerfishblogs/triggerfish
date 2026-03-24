/**
 * X executor factory — builds the X tool executor at startup.
 *
 * Resolves the X OAuth tokens from the OS keychain, creates the API client,
 * services, and returns a chain-compatible executor. Returns undefined if
 * X is not configured or tokens are not found (lazy error at tool-call time).
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { TriggerFishConfig } from "../../../core/config.ts";
import type { SessionId } from "../../../core/types/session.ts";
import { createKeychain } from "../../../core/secrets/keychain/keychain.ts";
import { createLogger } from "../../../core/logger/mod.ts";
import {
  createXApiClient,
  createXAuthManager,
  createXToolExecutor,
} from "../../../integrations/x/mod.ts";
import { createXRateLimiter } from "../../../integrations/x/client/mod.ts";
import { createXQuotaTracker } from "../../../integrations/x/client/mod.ts";
import { createPostsService } from "../../../integrations/x/posts/mod.ts";
import { createUsersService } from "../../../integrations/x/users/mod.ts";
import { createEngageService } from "../../../integrations/x/engage/mod.ts";
import { createListsService } from "../../../integrations/x/lists/mod.ts";
import type { XApiTier } from "../../../integrations/x/auth/types_auth.ts";

const log = createLogger("gateway.x");

/** Key for the authenticated user's X user ID in the keychain. */
const USER_ID_KEY = "x:user_id";

/**
 * Build the X tool executor from config and keychain.
 *
 * Returns undefined if X is not enabled. Returns a graceful "not configured"
 * executor if tokens are not found.
 */
export async function buildXExecutor(
  config: TriggerFishConfig,
  getSessionTaint: () => ClassificationLevel,
  sourceSessionId: SessionId,
): Promise<
  | ((name: string, input: Record<string, unknown>) => Promise<string | null>)
  | undefined
> {
  if (config.x?.enabled !== true) {
    return undefined;
  }

  const keychain = createKeychain();
  const authManager = createXAuthManager(keychain);

  const hasTokens = await authManager.hasTokens();
  if (!hasTokens) {
    log.warn("X enabled but tokens not found in keychain", {
      operation: "buildXExecutor",
    });
    return createXToolExecutor(undefined);
  }

  // Retrieve the authenticated user ID (stored during connect flow)
  const userIdResult = await keychain.getSecret(USER_ID_KEY);
  if (!userIdResult.ok) {
    log.warn("X tokens found but user ID not stored", {
      operation: "buildXExecutor",
      err: userIdResult.error,
    });
    return createXToolExecutor(undefined);
  }

  const tier = (config.x.tier ?? "free") as XApiTier;
  const rateLimiter = createXRateLimiter();
  const quotaTracker = createXQuotaTracker(keychain, tier, {
    warningThreshold: config.x.quota?.warning_ratio,
    cutoffThreshold: config.x.quota?.cutoff_ratio,
  });
  const apiClient = createXApiClient(authManager, rateLimiter);
  const authenticatedUserId = userIdResult.value;

  return createXToolExecutor({
    posts: createPostsService(apiClient, authenticatedUserId),
    users: createUsersService(apiClient, authenticatedUserId),
    engage: createEngageService(apiClient, authenticatedUserId),
    lists: createListsService(apiClient, authenticatedUserId),
    rateLimiter,
    quotaTracker,
    sessionTaint: getSessionTaint,
    sourceSessionId,
    tier,
    authenticatedUserId,
  });
}
