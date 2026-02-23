/**
 * Replay attack prevention for webhook requests.
 *
 * Tracks recently seen HMAC signatures in a bounded LRU set. When a
 * valid signature is replayed, it is detected and rejected. The set is
 * bounded to prevent unbounded memory growth; the oldest entry is evicted
 * when the limit is reached (JS Map preserves insertion order).
 *
 * @module
 */

/** Tracks recently seen HMAC signatures to detect replay attacks. */
export interface ReplayGuard {
  /** Returns true if this signature was seen recently (replay detected). */
  hasSeenSignature(signature: string): boolean;
  /**
   * Record a signature as seen.
   * Must be called only after verifying the signature is valid (HMAC passed).
   */
  recordSignature(signature: string): void;
}

/**
 * Create a replay guard backed by a bounded LRU set.
 *
 * Uses a JS Map (insertion-ordered) as an LRU set: when the set is full,
 * the oldest entry (first key) is evicted before inserting the new one.
 *
 * @param maxSize Maximum signatures to retain. Defaults to 10_000.
 */
export function createReplayGuard(maxSize = 10_000): ReplayGuard {
  const seen = new Map<string, true>();

  return {
    hasSeenSignature(signature: string): boolean {
      return seen.has(signature);
    },
    recordSignature(signature: string): void {
      if (seen.size >= maxSize) {
        seen.delete(seen.keys().next().value!);
      }
      seen.set(signature, true);
    },
  };
}
