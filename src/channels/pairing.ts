/**
 * Channel pairing service for linking messaging platforms to owner identity.
 *
 * Generates one-time 6-digit pairing codes with 5-minute expiry.
 * Codes are stored in the StorageProvider under the `pairing:` namespace.
 * Once verified, a code is marked as used and cannot be reused.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import type { StorageProvider } from "../core/storage/provider.ts";

/** A one-time pairing code for linking a channel to an identity. */
export interface PairingCode {
  readonly code: string;
  readonly channelType: string;
  readonly expiresAt: Date;
  readonly used: boolean;
}

/** Result of a successful pairing verification. */
export interface PairingResult {
  readonly channelType: string;
  readonly platformUserId: string;
  readonly linkedAt: Date;
}

/** Service for generating and verifying channel pairing codes. */
export interface PairingService {
  /**
   * Generate a 6-digit pairing code for the given channel type.
   * The code expires after 5 minutes and is stored in the StorageProvider.
   */
  generateCode(channelType: string): Promise<PairingCode>;

  /**
   * Verify a pairing code and link the platform user identity.
   * Returns an error if the code is invalid, expired, already used,
   * or does not match the given channel type.
   */
  verifyCode(
    code: string,
    channelType: string,
    platformUserId: string,
  ): Promise<Result<PairingResult, string>>;

  /**
   * Get the pending (unused, unexpired) pairing code for a channel type.
   * Returns null if no valid pending code exists.
   */
  getPending(channelType: string): Promise<PairingCode | null>;
}

/** Default pairing code TTL: 5 minutes in milliseconds. */
const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;

/** Storage key prefix for pairing codes. */
const PAIRING_PREFIX = "pairing:";

/** Storage key prefix for linked pairings. */
const LINKED_PREFIX = "pairing:linked:";

/** Optional clock injection for testability. Defaults to Date.now. */
export interface PairingOptions {
  readonly now?: () => number;
}

/**
 * Generate a cryptographically random 6-digit code.
 * Uses crypto.getRandomValues for secure randomness.
 */
function generateSixDigitCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Modulo 1_000_000 gives a number in [0, 999999], then pad to 6 digits.
  const code = (array[0] % 1_000_000).toString().padStart(6, "0");
  return code;
}

/** Serialize a PairingCode to a JSON string for storage. */
function serializePairingCode(pc: PairingCode): string {
  return JSON.stringify({
    code: pc.code,
    channelType: pc.channelType,
    expiresAt: pc.expiresAt.toISOString(),
    used: pc.used,
  });
}

/** Deserialize a PairingCode from a JSON string. */
function deserializePairingCode(raw: string): PairingCode {
  const parsed = JSON.parse(raw) as {
    code: string;
    channelType: string;
    expiresAt: string;
    used: boolean;
  };
  return {
    code: parsed.code,
    channelType: parsed.channelType,
    expiresAt: new Date(parsed.expiresAt),
    used: parsed.used,
  };
}

/**
 * Create a PairingService backed by the given StorageProvider.
 *
 * @param storage - The storage provider to persist pairing codes.
 * @param options - Optional configuration (e.g. clock injection for tests).
 * @returns A PairingService instance.
 */
export function createPairingService(
  storage: StorageProvider,
  options?: PairingOptions,
): PairingService {
  const now = options?.now ?? (() => Date.now());

  return {
    async generateCode(channelType: string): Promise<PairingCode> {
      const code = generateSixDigitCode();
      const expiresAt = new Date(now() + PAIRING_CODE_TTL_MS);
      const pairingCode: PairingCode = {
        code,
        channelType,
        expiresAt,
        used: false,
      };

      // Store under pairing:<channelType>:<code> for lookup by code,
      // and pairing:pending:<channelType> for lookup by channel type.
      const codeKey = `${PAIRING_PREFIX}${channelType}:${code}`;
      const pendingKey = `${PAIRING_PREFIX}pending:${channelType}`;

      await storage.set(codeKey, serializePairingCode(pairingCode));
      await storage.set(pendingKey, serializePairingCode(pairingCode));

      return pairingCode;
    },

    async verifyCode(
      code: string,
      channelType: string,
      platformUserId: string,
    ): Promise<Result<PairingResult, string>> {
      const codeKey = `${PAIRING_PREFIX}${channelType}:${code}`;
      const raw = await storage.get(codeKey);

      if (raw === null) {
        return { ok: false, error: "Invalid pairing code" };
      }

      const pairingCode = deserializePairingCode(raw);

      if (pairingCode.channelType !== channelType) {
        return { ok: false, error: "Channel type mismatch" };
      }

      if (pairingCode.used) {
        return { ok: false, error: "Pairing code already used" };
      }

      if (pairingCode.expiresAt.getTime() <= now()) {
        return { ok: false, error: "Pairing code expired" };
      }

      // Mark the code as used.
      const usedCode: PairingCode = {
        ...pairingCode,
        used: true,
      };
      await storage.set(codeKey, serializePairingCode(usedCode));

      // Update pending key to reflect used status.
      const pendingKey = `${PAIRING_PREFIX}pending:${channelType}`;
      await storage.set(pendingKey, serializePairingCode(usedCode));

      // Store the linked pairing result.
      const linkedAt = new Date(now());
      const pairingResult: PairingResult = {
        channelType,
        platformUserId,
        linkedAt,
      };
      const linkedKey = `${LINKED_PREFIX}${channelType}:${platformUserId}`;
      await storage.set(linkedKey, JSON.stringify({
        channelType: pairingResult.channelType,
        platformUserId: pairingResult.platformUserId,
        linkedAt: pairingResult.linkedAt.toISOString(),
      }));

      return { ok: true, value: pairingResult };
    },

    async getPending(channelType: string): Promise<PairingCode | null> {
      const pendingKey = `${PAIRING_PREFIX}pending:${channelType}`;
      const raw = await storage.get(pendingKey);

      if (raw === null) {
        return null;
      }

      const pairingCode = deserializePairingCode(raw);

      // Return null if the code is used or expired.
      if (pairingCode.used) {
        return null;
      }

      if (pairingCode.expiresAt.getTime() <= now()) {
        return null;
      }

      return pairingCode;
    },
  };
}
