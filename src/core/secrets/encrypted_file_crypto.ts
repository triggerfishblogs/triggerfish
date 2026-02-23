/**
 * AES-256-GCM encryption and decryption primitives for secret entries.
 *
 * Provides base64 encoding helpers and encrypt/decrypt operations
 * that produce/consume {@link EncryptedEntry} values with fresh IVs.
 *
 * @module
 */

import type { Result } from "../types/classification.ts";
import type { EncryptedEntry } from "./encrypted_file_types.ts";

/** Encode a Uint8Array to base64 string. */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode a base64 string to Uint8Array. */
export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encrypt a plaintext value with AES-256-GCM using a fresh 12-byte IV. */
export async function encryptSecretValue(
  key: CryptoKey,
  plaintext: string,
): Promise<Result<EncryptedEntry, string>> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded,
    );
    return {
      ok: true,
      value: { iv: toBase64(iv), ct: toBase64(new Uint8Array(ciphertext)) },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Encryption failed: ${message}` };
  }
}

/** Decrypt an AES-256-GCM encrypted entry back to plaintext. */
export async function decryptSecretEntry(
  key: CryptoKey,
  entry: EncryptedEntry,
): Promise<Result<string, string>> {
  try {
    const iv = fromBase64(entry.iv);
    const ct = fromBase64(entry.ct);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      ct.buffer as ArrayBuffer,
    );
    return { ok: true, value: new TextDecoder().decode(plaintext) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Decryption failed: ${message}` };
  }
}
