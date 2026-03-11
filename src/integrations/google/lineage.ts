/**
 * Lineage recording helper for Google API responses.
 *
 * Records data provenance after each successful Google API call,
 * using the session's lineage store when available.
 *
 * @module
 */

import type { GoogleToolContext } from "./auth/types_context.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("google-lineage");

/**
 * Record a lineage entry for a Google API response.
 *
 * No-ops when lineageStore is absent. Catches all errors so
 * lineage failures never block tool execution.
 */
export async function recordGoogleLineage(
  ctx: GoogleToolContext,
  serviceName: string,
  operation: string,
  content: string,
): Promise<void> {
  if (!ctx.lineageStore) return;
  try {
    await ctx.lineageStore.create({
      content,
      origin: {
        source_type: "google_api",
        source_name: serviceName,
        accessed_at: new Date().toISOString(),
        accessed_by: "owner",
        access_method: operation,
      },
      classification: {
        level: ctx.sessionTaint(),
        reason: `Google ${serviceName}: ${operation}`,
      },
      sessionId: ctx.sourceSessionId,
    });
  } catch (err: unknown) {
    log.warn("Google lineage record creation failed", { operation: "recordGoogleLineage", serviceName, err });
  }
}
