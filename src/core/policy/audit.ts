/**
 * Audit log HMAC chain — cryptographic integrity for audit entries.
 *
 * Each audit entry's HMAC includes the previous entry's hash, forming
 * a tamper-evident chain. Verification walks the chain from genesis,
 * recomputing each HMAC and comparing against the stored value.
 *
 * Uses HMAC-SHA256 via crypto.subtle.
 *
 * @module
 */

import type { Result } from "../types/classification.ts";
import { createLogger } from "../logger/logger.ts";

const log = createLogger("audit");

/**
 * Minimal audit entry for chaining. Compatible with HookLogEntry but
 * does not require the full session/hook type imports — any serializable
 * record works.
 */
export interface AuditEntry {
  readonly timestamp: Date;
  readonly [key: string]: unknown;
}

/** An audit entry enriched with chain metadata. */
export interface ChainedAuditEntry {
  /** The original audit payload. */
  readonly entry: AuditEntry;
  /** Hex-encoded HMAC-SHA256 of (previousHash + canonicalized entry). */
  readonly hash: string;
  /** Hex-encoded hash of the preceding entry (or genesis hash). */
  readonly previousHash: string;
  /** Zero-based index in the chain. */
  readonly index: number;
}

/** HMAC audit chain with append, verify, and read operations. */
export interface AuditChain {
  /** Append an entry to the chain, computing its chained HMAC. */
  append(entry: AuditEntry): Promise<ChainedAuditEntry>;
  /** Verify the entire chain's integrity from genesis to tail. */
  verify(): Promise<Result<true, string>>;
  /** Return a readonly snapshot of all chained entries. */
  entries(): readonly ChainedAuditEntry[];
}

/** Genesis hash — 64 hex zeros (representing a 32-byte all-zero SHA-256). */
const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Import an HMAC-SHA256 signing key from a secret string.
 *
 * @param secret - The shared secret used for HMAC computation
 * @returns A CryptoKey suitable for HMAC-SHA256 sign/verify
 */
async function importHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Canonicalize an AuditEntry to a deterministic JSON string.
 *
 * Keys are sorted lexicographically. Date objects are serialized
 * as ISO-8601 strings. This ensures identical entries always
 * produce the same canonical form.
 */
function canonicalize(entry: AuditEntry): string {
  return JSON.stringify(entry, (_key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
}

/**
 * Compute HMAC-SHA256 over (previousHash + canonical entry) and return hex.
 *
 * @param key - The HMAC CryptoKey
 * @param previousHash - Hex string of the previous chain entry's hash
 * @param entry - The audit entry to hash
 * @returns Hex-encoded HMAC digest
 */
async function computeHmac(
  key: CryptoKey,
  previousHash: string,
  entry: AuditEntry,
): Promise<string> {
  const message = previousHash + canonicalize(entry);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );
  return bufferToHex(new Uint8Array(signature));
}

/**
 * Convert a Uint8Array to a lowercase hex string.
 */
function bufferToHex(buffer: Uint8Array): string {
  const hexChars: string[] = [];
  for (const byte of buffer) {
    hexChars.push(byte.toString(16).padStart(2, "0"));
  }
  return hexChars.join("");
}

/**
 * Create a new HMAC audit chain.
 *
 * The chain starts with a genesis hash (all zeros). Each appended
 * entry's HMAC incorporates the previous entry's hash, creating
 * a tamper-evident chain.
 *
 * @param secret - The shared secret for HMAC-SHA256 computation
 * @returns An AuditChain instance
 *
 * @example
 * ```ts
 * const chain = createAuditChain("my-secret-key");
 * await chain.append({ timestamp: new Date(), hook: "PRE_OUTPUT" });
 * const result = await chain.verify();
 * // result = { ok: true, value: true }
 * ```
 */
/** Append a new entry to the audit chain. */
async function appendChainEntry(
  chainEntries: ChainedAuditEntry[],
  key: CryptoKey,
  entry: AuditEntry,
): Promise<ChainedAuditEntry> {
  const previousHash = chainEntries.length > 0
    ? chainEntries[chainEntries.length - 1].hash
    : GENESIS_HASH;
  const hash = await computeHmac(key, previousHash, entry);
  const chained: ChainedAuditEntry = {
    entry,
    hash,
    previousHash,
    index: chainEntries.length,
  };
  chainEntries.push(chained);
  return chained;
}

/** Verify a single chain entry's linkage and HMAC. */
async function verifyChainEntry(
  key: CryptoKey,
  current: ChainedAuditEntry,
  expectedPreviousHash: string,
  index: number,
  logPrefix: string,
): Promise<Result<true, string>> {
  if (current.previousHash !== expectedPreviousHash) {
    log.warn(`${logPrefix}: previousHash mismatch`, {
      index,
      expected: expectedPreviousHash,
      got: current.previousHash,
    });
    return {
      ok: false,
      error:
        `Chain broken at index ${index}: previousHash mismatch (expected ${expectedPreviousHash}, got ${current.previousHash})`,
    };
  }
  const recomputed = await computeHmac(
    key,
    current.previousHash,
    current.entry,
  );
  if (recomputed !== current.hash) {
    log.warn(`${logPrefix}: HMAC mismatch`, { index });
    return {
      ok: false,
      error:
        `Chain broken at index ${index}: HMAC mismatch (entry may have been tampered with)`,
    };
  }
  return { ok: true, value: true };
}

/** Verify an array of chained entries from genesis to tail. */
async function verifyChainEntries(
  key: CryptoKey,
  chainEntries: readonly ChainedAuditEntry[],
  logPrefix: string,
): Promise<Result<true, string>> {
  for (let i = 0; i < chainEntries.length; i++) {
    const expectedPrev = i === 0 ? GENESIS_HASH : chainEntries[i - 1].hash;
    const result = await verifyChainEntry(
      key,
      chainEntries[i],
      expectedPrev,
      i,
      logPrefix,
    );
    if (!result.ok) return result;
  }
  return { ok: true, value: true };
}

/**
 * Create a new HMAC audit chain.
 *
 * The chain starts with a genesis hash (all zeros). Each appended
 * entry's HMAC incorporates the previous entry's hash, creating
 * a tamper-evident chain.
 *
 * @param secret - The shared secret for HMAC-SHA256 computation
 * @returns An AuditChain instance
 */
export function createAuditChain(secret: string): AuditChain {
  const chainEntries: ChainedAuditEntry[] = [];
  let hmacKeyPromise: Promise<CryptoKey> | undefined;

  function getKey(): Promise<CryptoKey> {
    if (!hmacKeyPromise) hmacKeyPromise = importHmacKey(secret);
    return hmacKeyPromise;
  }

  return {
    async append(entry: AuditEntry): Promise<ChainedAuditEntry> {
      return appendChainEntry(chainEntries, await getKey(), entry);
    },
    async verify(): Promise<Result<true, string>> {
      if (chainEntries.length === 0) return { ok: true, value: true };
      return verifyChainEntries(
        await getKey(),
        chainEntries,
        "Audit chain tamper detected",
      );
    },
    entries: () => [...chainEntries],
  };
}

/**
 * Verify an externally-provided array of chained audit entries.
 *
 * This is a standalone verification utility that does not require
 * the original AuditChain instance — only the secret and the entries.
 *
 * @param secret - The shared secret used when creating the chain
 * @param chainedEntries - The array of ChainedAuditEntry to verify
 * @returns Result indicating validity or describing the failure
 */
/** Validate that chain entry indices are sequential. */
function validateChainIndices(
  chainedEntries: readonly ChainedAuditEntry[],
): Result<true, string> {
  for (let i = 0; i < chainedEntries.length; i++) {
    if (chainedEntries[i].index !== i) {
      return {
        ok: false,
        error: `Chain broken at position ${i}: expected index ${i}, got ${
          chainedEntries[i].index
        }`,
      };
    }
  }
  return { ok: true, value: true };
}

/**
 * Verify an externally-provided array of chained audit entries.
 *
 * This is a standalone verification utility that does not require
 * the original AuditChain instance — only the secret and the entries.
 */
export async function verifyAuditChain(
  secret: string,
  chainedEntries: readonly ChainedAuditEntry[],
): Promise<Result<true, string>> {
  if (chainedEntries.length === 0) return { ok: true, value: true };

  const indexResult = validateChainIndices(chainedEntries);
  if (!indexResult.ok) return indexResult;

  const key = await importHmacKey(secret);
  return verifyChainEntries(
    key,
    chainedEntries,
    "Audit chain verification failed",
  );
}
