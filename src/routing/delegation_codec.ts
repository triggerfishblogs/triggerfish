/**
 * Encoding, decoding, and serialisation for delegation certificates and chains.
 *
 * Handles base64 encoding/decoding, canonical payload construction,
 * and JSON serialisation/deserialisation for storage persistence.
 *
 * @module
 */

import type {
  DelegationCertificate,
  DelegationChain,
  UnsignedCertificate,
} from "./delegation_types.ts";

/** Shape of a serialised delegation certificate in JSON storage. */
export interface SerialisedCertificate {
  readonly delegator: string;
  readonly delegate: string;
  readonly permissions: readonly string[];
  readonly expiry: string;
  readonly signature: string;
  readonly publicKey: string;
}

/**
 * Encode raw bytes as a base64 string.
 *
 * @param bytes - Raw bytes to encode
 * @returns Base64-encoded string
 */
export function encodeBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/**
 * Decode a base64 string to raw bytes.
 *
 * @param b64 - Base64-encoded string
 * @returns Raw byte array
 */
export function decodeBase64(b64: string): Uint8Array {
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
export function buildCertificatePayload(
  cert: UnsignedCertificate,
): Uint8Array {
  const canonical = JSON.stringify({
    delegator: cert.delegator,
    delegate: cert.delegate,
    permissions: [...cert.permissions],
    expiry: cert.expiry.toISOString(),
  });
  return new TextEncoder().encode(canonical);
}

/** Convert a serialised certificate record to a DelegationCertificate. */
function hydrateStoredCertificate(
  c: SerialisedCertificate,
): DelegationCertificate {
  return {
    delegator: c.delegator,
    delegate: c.delegate,
    permissions: [...c.permissions],
    expiry: new Date(c.expiry),
    signature: c.signature,
    publicKey: c.publicKey,
  };
}

/** Serialise a delegation chain to a JSON string for storage. */
export function serialiseDelegationChain(chain: DelegationChain): string {
  return JSON.stringify({
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
}

/** Deserialise a stored JSON string back to a DelegationChain. */
export function deserialiseDelegationChain(raw: string): DelegationChain {
  const parsed = JSON.parse(raw) as {
    readonly root: string;
    readonly leaf: string;
    readonly certificates: readonly SerialisedCertificate[];
  };
  return {
    root: parsed.root,
    leaf: parsed.leaf,
    certificates: parsed.certificates.map(hydrateStoredCertificate),
  };
}
