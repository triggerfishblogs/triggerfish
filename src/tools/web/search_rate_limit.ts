/**
 * Rate-limited search provider wrapper.
 *
 * Wraps any SearchProvider with minimum-interval rate limiting.
 * Concurrent calls are serialized to prevent burst violations.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { SearchProvider } from "./search_types.ts";

const log = createLogger("search");

/**
 * Wrap a SearchProvider with minimum-interval rate limiting.
 *
 * Concurrent calls are serialized — each waits for the previous to start
 * before beginning its own delay. This prevents bursts from exceeding the
 * configured requests-per-second limit.
 *
 * @param provider - The underlying search provider to wrap
 * @param requestsPerSecond - Maximum requests per second (e.g. 1 for Brave free tier)
 * @returns A rate-limited SearchProvider with the same interface
 */
export function createRateLimitedSearchProvider(
  provider: SearchProvider,
  requestsPerSecond: number,
): SearchProvider {
  const minIntervalMs = 1000 / requestsPerSecond;
  let lastRequestTime = 0;
  let pending: Promise<unknown> = Promise.resolve();

  return {
    id: provider.id,
    name: provider.name,
    search(query, options) {
      const job = pending.then(async () => {
        const now = Date.now();
        const elapsed = now - lastRequestTime;
        if (elapsed < minIntervalMs) {
          await new Promise((resolve) =>
            setTimeout(resolve, minIntervalMs - elapsed)
          );
        }
        lastRequestTime = Date.now();
        return provider.search(query, options);
      });
      pending = job.catch((err: unknown) => {
        log.debug("Rate-limited search job failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
      return job;
    },
  };
}
