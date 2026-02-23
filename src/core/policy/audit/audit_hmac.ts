/**
 * HMAC-SHA256 cryptographic primitives for the audit chain.
 *
 * Provides key import, canonical serialization, HMAC computation,
 * and hex encoding used by the audit chain to produce tamper-evident
 * entry hashes.
 *
 * @module
 */

import type { AuditEntry } from "./audit.ts";

/** Genesis hash — 64 hex zeros (representing a 32-byte all-zero SHA-256). */
export const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Import an HMAC-SHA256 signing key from a secret string.
 *
 * @param secret - The shared secret used for HMAC computation
 * @returns A CryptoKey suitable for HMAC-SHA256 sign/verify
 */
export async function importHmacKey(secret: string): Promise<CryptoKey> {
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
export function canonicalize(entry: AuditEntry): string {
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
 * Convert a Uint8Array to a lowercase hex string.
 */
export function bufferToHex(buffer: Uint8Array): string {
  const hexChars: string[] = [];
  for (const byte of buffer) {
    hexChars.push(byte.toString(16).padStart(2, "0"));
  }
  return hexChars.join("");
}

/**
 * Compute HMAC-SHA256 over (previousHash + canonical entry) and return hex.
 *
 * @param key - The HMAC CryptoKey
 * @param previousHash - Hex string of the previous chain entry's hash
 * @param entry - The audit entry to hash
 * @returns Hex-encoded HMAC digest
 */
export async function computeHmac(
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
