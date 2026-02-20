/**
 * Machine-bound encryption key management.
 *
 * Generates or loads a 256-bit AES-GCM key stored as raw bytes in a
 * dedicated key file. The key file is the machine secret: it is placed
 * in a user-owned directory and chmod 0600 on Unix systems.
 *
 * @module
 */

import { dirname } from "@std/path";
import type { Result } from "../types/classification.ts";

/** Options for loading or creating the machine key. */
export interface MachineKeyOptions {
  /** Absolute path to the key file (e.g. `~/.triggerfish/secrets.key`). */
  readonly keyPath: string;
}

/**
 * Load the machine encryption key from disk, or generate a new one if
 * the key file does not exist.
 *
 * - If the key file exists: reads 32 raw bytes and imports as AES-256-GCM.
 * - If absent: generates a new random 256-bit key, writes raw bytes to disk,
 *   and sets file permissions to 0600 on Unix.
 *
 * @param options - Key file path configuration
 * @returns The CryptoKey on success, or an error string on failure
 */
export async function loadOrCreateMachineKey(
  options: MachineKeyOptions,
): Promise<Result<CryptoKey, string>> {
  const { keyPath } = options;

  try {
    // Attempt to read existing key file
    let rawBytes: Uint8Array;
    try {
      const fileBytes = await Deno.readFile(keyPath);
      if (fileBytes.byteLength !== 32) {
        return {
          ok: false,
          error: `Key file '${keyPath}' is corrupt: expected 32 bytes, got ${fileBytes.byteLength}`,
        };
      }
      rawBytes = fileBytes;
    } catch {
      // Key file does not exist — generate a new key
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );
      const exported = await crypto.subtle.exportKey("raw", key);
      rawBytes = new Uint8Array(exported);

      // Write key file with restrictive permissions
      await Deno.mkdir(dirname(keyPath), { recursive: true });
      await Deno.writeFile(keyPath, rawBytes, { mode: 0o600 });

      // Explicitly chmod on Unix (writeFile mode may be masked by umask)
      if (Deno.build.os !== "windows") {
        try {
          await Deno.chmod(keyPath, 0o600);
        } catch {
          // Best-effort; chmod may fail in restricted containers
        }
      }

      return { ok: true, value: key };
    }

    // Import the existing raw bytes as AES-GCM key
    const key = await crypto.subtle.importKey(
      "raw",
      rawBytes.buffer as ArrayBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
    return { ok: true, value: key };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to load machine key: ${message}` };
  }
}
