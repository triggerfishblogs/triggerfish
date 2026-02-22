/**
 * Agent delegation chains for multi-agent trust propagation.
 *
 * Implements Ed25519-signed delegation certificates that form verifiable
 * chains from a root agent to any delegate. Each certificate grants specific
 * permissions from a delegator to a delegate with an expiry timestamp.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import type { StorageProvider } from "../core/storage/provider.ts";
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("security");

/** A signed certificate granting permissions from one agent to another. */
export interface DelegationCertificate {
  /** Agent ID of the entity granting delegation. */
  readonly delegator: string;
  /** Agent ID of the entity receiving delegation. */
  readonly delegate: string;
  /** Permissions granted by this delegation. */
  readonly permissions: readonly string[];
  /** When this delegation expires. */
  readonly expiry: Date;
  /** Base64-encoded Ed25519 signature over the certificate payload. */
  readonly signature: string;
  /** Base64-encoded raw Ed25519 public key of the delegator. */
  readonly publicKey: string;
}

/** A chain of delegation certificates from root to current agent. */
export interface DelegationChain {
  /** Ordered list of certificates; cert[0] is the root delegation. */
  readonly certificates: readonly DelegationCertificate[];
  /** The root delegator (cert[0].delegator). */
  readonly root: string;
  /** The final delegate (last cert's delegate). */
  readonly leaf: string;
}

/** Service for creating, signing, verifying, and storing delegation chains. */
export interface DelegationService {
  /** Generate a new Ed25519 keypair for signing delegation certificates. */
  generateKeypair(): Promise<Result<DelegationKeypair, string>>;

  /** Sign a delegation certificate with the delegator's private key. */
  signCertificate(
    privateKey: CryptoKey,
    cert: UnsignedCertificate,
  ): Promise<Result<DelegationCertificate, string>>;

  /** Verify a single delegation certificate's signature and expiry. */
  verifyCertificate(cert: DelegationCertificate): Promise<Result<true, string>>;

  /** Verify an entire delegation chain. */
  verifyChain(chain: DelegationChain): Promise<Result<true, string>>;

  /** Store a delegation chain under a key. */
  storeChain(
    chainId: string,
    chain: DelegationChain,
  ): Promise<Result<true, string>>;

  /** Retrieve a stored delegation chain by key. */
  loadChain(chainId: string): Promise<Result<DelegationChain, string>>;
}

/** An Ed25519 keypair for delegation signing. */
export interface DelegationKeypair {
  readonly publicKey: CryptoKey;
  readonly privateKey: CryptoKey;
}

/** Certificate fields before signing. */
export interface UnsignedCertificate {
  readonly delegator: string;
  readonly delegate: string;
  readonly permissions: readonly string[];
  readonly expiry: Date;
}

/**
 * Encode bytes as base64.
 *
 * @param bytes - Raw bytes to encode
 * @returns Base64-encoded string
 */
function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/**
 * Decode a base64 string to bytes.
 *
 * @param b64 - Base64-encoded string
 * @returns Raw byte array
 */
function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Build the canonical payload bytes for a certificate.
 *
 * The payload is a deterministic UTF-8 encoding of the certificate
 * fields (excluding signature and publicKey) so signatures are stable.
 *
 * @param cert - Certificate fields to serialize
 * @returns UTF-8 encoded payload bytes
 */
function buildPayload(cert: UnsignedCertificate): Uint8Array {
  const canonical = JSON.stringify({
    delegator: cert.delegator,
    delegate: cert.delegate,
    permissions: [...cert.permissions],
    expiry: cert.expiry.toISOString(),
  });
  return new TextEncoder().encode(canonical);
}

/**
 * Create a delegation service backed by a StorageProvider.
 *
 * All delegation chains are stored under the `delegation:` key namespace.
 *
 * @param storage - StorageProvider for persisting delegation chains
 * @returns A DelegationService instance
 */
export function createDelegationService(
  storage: StorageProvider,
): DelegationService {
  const NAMESPACE = "delegation:";

  return {
    async generateKeypair(): Promise<Result<DelegationKeypair, string>> {
      try {
        const keyPair = await crypto.subtle.generateKey(
          "Ed25519",
          true,
          ["sign", "verify"],
        ) as CryptoKeyPair;

        return {
          ok: true,
          value: {
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
          },
        };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `Keypair generation failed: ${message}` };
      }
    },

    async signCertificate(
      privateKey: CryptoKey,
      cert: UnsignedCertificate,
    ): Promise<Result<DelegationCertificate, string>> {
      try {
        const payload = buildPayload(cert);
        const signatureBuffer = await crypto.subtle.sign(
          "Ed25519",
          privateKey,
          payload,
        );
        const signature = toBase64(signatureBuffer);

        // Extract the public key that corresponds to this private key.
        // We need the public key from the keypair. Since Ed25519 private keys
        // in Web Crypto don't expose the public key directly, we derive it
        // by exporting the private key in JWK format which includes the public component.
        const jwk = await crypto.subtle.exportKey("jwk", privateKey);
        if (!jwk.x) {
          return { ok: false, error: "Failed to extract public key from private key" };
        }
        // jwk.x is the base64url-encoded public key
        const publicKeyBase64 = jwk.x.replace(/-/g, "+").replace(/_/g, "/");
        // Pad to correct length
        const padded = publicKeyBase64 + "=".repeat(
          (4 - publicKeyBase64.length % 4) % 4,
        );
        const publicKeyBytes = fromBase64(padded);

        // Re-import as a CryptoKey to export as raw
        const pubCryptoKey = await crypto.subtle.importKey(
          "raw",
          publicKeyBytes,
          "Ed25519",
          true,
          ["verify"],
        );
        const rawPublicKey = await crypto.subtle.exportKey("raw", pubCryptoKey);
        const publicKeyB64 = toBase64(rawPublicKey);

        return {
          ok: true,
          value: {
            delegator: cert.delegator,
            delegate: cert.delegate,
            permissions: cert.permissions,
            expiry: cert.expiry,
            signature,
            publicKey: publicKeyB64,
          },
        };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `Signing failed: ${message}` };
      }
    },

    async verifyCertificate(
      cert: DelegationCertificate,
    ): Promise<Result<true, string>> {
      try {
        // Check expiry first
        if (cert.expiry.getTime() < Date.now()) {
          log.warn("Delegation certificate expired", {
            delegator: cert.delegator,
            delegate: cert.delegate,
          });
          return { ok: false, error: "Certificate has expired" };
        }

        // Reconstruct the payload
        const payload = buildPayload({
          delegator: cert.delegator,
          delegate: cert.delegate,
          permissions: cert.permissions,
          expiry: cert.expiry,
        });

        // Import the public key
        const publicKeyBytes = fromBase64(cert.publicKey);
        const publicKey = await crypto.subtle.importKey(
          "raw",
          publicKeyBytes,
          "Ed25519",
          false,
          ["verify"],
        );

        // Verify the signature
        const signatureBytes = fromBase64(cert.signature);
        const valid = await crypto.subtle.verify(
          "Ed25519",
          publicKey,
          signatureBytes,
          payload,
        );

        if (!valid) {
          log.warn("Delegation certificate signature invalid", {
            delegator: cert.delegator,
            delegate: cert.delegate,
          });
          return { ok: false, error: "Invalid certificate signature" };
        }

        return { ok: true, value: true };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `Verification failed: ${message}` };
      }
    },

    async verifyChain(
      chain: DelegationChain,
    ): Promise<Result<true, string>> {
      if (chain.certificates.length === 0) {
        return { ok: false, error: "Delegation chain is empty" };
      }

      // Verify each certificate individually
      for (let i = 0; i < chain.certificates.length; i++) {
        const cert = chain.certificates[i];
        const result = await this.verifyCertificate(cert);
        if (!result.ok) {
          return {
            ok: false,
            error: `Certificate at index ${i} is invalid: ${result.error}`,
          };
        }
      }

      // Verify chain linkage: delegator of cert[n+1] must match delegate of cert[n]
      for (let i = 0; i < chain.certificates.length - 1; i++) {
        const current = chain.certificates[i];
        const next = chain.certificates[i + 1];
        if (next.delegator !== current.delegate) {
          log.warn("Delegation chain linkage broken", {
            index: i,
            delegate: current.delegate,
            nextDelegator: next.delegator,
          });
          return {
            ok: false,
            error: `Chain broken at index ${i}: delegate "${current.delegate}" does not match next delegator "${next.delegator}"`,
          };
        }
      }

      return { ok: true, value: true };
    },

    async storeChain(
      chainId: string,
      chain: DelegationChain,
    ): Promise<Result<true, string>> {
      try {
        const serialized = JSON.stringify({
          root: chain.root,
          leaf: chain.leaf,
          certificates: chain.certificates.map((cert) => ({
            delegator: cert.delegator,
            delegate: cert.delegate,
            permissions: [...cert.permissions],
            expiry: cert.expiry.toISOString(),
            signature: cert.signature,
            publicKey: cert.publicKey,
          })),
        });
        await storage.set(`${NAMESPACE}${chainId}`, serialized);
        return { ok: true, value: true };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `Failed to store chain: ${message}` };
      }
    },

    async loadChain(
      chainId: string,
    ): Promise<Result<DelegationChain, string>> {
      try {
        const raw = await storage.get(`${NAMESPACE}${chainId}`);
        if (raw === null || raw === undefined) {
          return { ok: false, error: `Chain not found: ${chainId}` };
        }

        const parsed = JSON.parse(raw) as {
          readonly root: string;
          readonly leaf: string;
          readonly certificates: readonly {
            readonly delegator: string;
            readonly delegate: string;
            readonly permissions: readonly string[];
            readonly expiry: string;
            readonly signature: string;
            readonly publicKey: string;
          }[];
        };

        const chain: DelegationChain = {
          root: parsed.root,
          leaf: parsed.leaf,
          certificates: parsed.certificates.map((c) => ({
            delegator: c.delegator,
            delegate: c.delegate,
            permissions: [...c.permissions],
            expiry: new Date(c.expiry),
            signature: c.signature,
            publicKey: c.publicKey,
          })),
        };

        return { ok: true, value: chain };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `Failed to load chain: ${message}` };
      }
    },
  };
}
