/**
 * Ed25519 cryptographic operations for delegation certificates.
 *
 * Provides keypair generation, certificate signing, single-certificate
 * verification, and chain linkage validation.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import { createLogger } from "../core/logger/logger.ts";
import type {
  DelegationCertificate,
  DelegationChain,
  DelegationKeypair,
  UnsignedCertificate,
} from "./delegation_types.ts";
import {
  buildCertificatePayload,
  decodeBase64,
  encodeBase64,
} from "./delegation_codec.ts";

const log = createLogger("security");

/** Generate a new Ed25519 keypair for delegation signing. */
export async function generateDelegationKeypair(): Promise<
  Result<DelegationKeypair, string>
> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      "Ed25519",
      true,
      ["sign", "verify"],
    ) as CryptoKeyPair;
    return {
      ok: true,
      value: { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey },
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Keypair generation failed: ${message}` };
  }
}

/** Convert a base64url JWK x-parameter to standard base64 with padding. */
function normaliseJwkPublicParam(base64Url: string): string {
  const base64Standard = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return base64Standard + "=".repeat((4 - base64Standard.length % 4) % 4);
}

/** Extract the raw Ed25519 public key (base64) from an Ed25519 private key. */
async function extractRawPublicKeyFromPrivate(
  privateKey: CryptoKey,
): Promise<Result<string, string>> {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  if (!jwk.x) {
    return {
      ok: false,
      error: "Delegation public key extraction failed: missing JWK x parameter",
    };
  }
  const padded = normaliseJwkPublicParam(jwk.x);
  return await importAndExportRawPublicKey(padded);
}

/** Import base64 public key bytes, re-export as raw base64 for the certificate. */
async function importAndExportRawPublicKey(
  paddedBase64: string,
): Promise<Result<string, string>> {
  const publicKeyBytes = decodeBase64(paddedBase64);
  const pubCryptoKey = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    "Ed25519",
    true,
    ["verify"],
  );
  const rawPublicKey = await crypto.subtle.exportKey("raw", pubCryptoKey);
  return { ok: true, value: encodeBase64(rawPublicKey) };
}

/** Build a signed DelegationCertificate from an unsigned cert, signature, and public key. */
function assembleDelegationCertificate(
  cert: UnsignedCertificate,
  signature: string,
  publicKey: string,
): DelegationCertificate {
  return {
    delegator: cert.delegator,
    delegate: cert.delegate,
    permissions: cert.permissions,
    expiry: cert.expiry,
    signature,
    publicKey,
  };
}

/** Sign a delegation certificate with the delegator's private key. */
export async function signDelegationCertificate(
  privateKey: CryptoKey,
  cert: UnsignedCertificate,
): Promise<Result<DelegationCertificate, string>> {
  try {
    const payload = buildCertificatePayload(cert);
    const signatureBuffer = await crypto.subtle.sign(
      "Ed25519",
      privateKey,
      payload,
    );
    const signature = encodeBase64(signatureBuffer);
    const pubKeyResult = await extractRawPublicKeyFromPrivate(privateKey);
    if (!pubKeyResult.ok) return pubKeyResult;
    const value = assembleDelegationCertificate(
      cert,
      signature,
      pubKeyResult.value,
    );
    return { ok: true, value };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Signing failed: ${message}` };
  }
}

/** Import a raw Ed25519 public key from base64 for verification. */
async function importVerificationKey(
  publicKeyBase64: string,
): Promise<CryptoKey> {
  const publicKeyBytes = decodeBase64(publicKeyBase64);
  return await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    "Ed25519",
    false,
    ["verify"],
  );
}

/** Verify the Ed25519 signature on a certificate against its embedded public key. */
async function verifySignatureAgainstPublicKey(
  cert: DelegationCertificate,
): Promise<Result<true, string>> {
  const payload = buildCertificatePayload(cert);
  const publicKey = await importVerificationKey(cert.publicKey);
  const signatureBytes = decodeBase64(cert.signature);
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
}

/** Verify a single delegation certificate's signature and expiry. */
export async function verifyDelegationCertificate(
  cert: DelegationCertificate,
): Promise<Result<true, string>> {
  try {
    if (cert.expiry.getTime() < Date.now()) {
      log.warn("Delegation certificate expired", {
        delegator: cert.delegator,
        delegate: cert.delegate,
      });
      return { ok: false, error: "Certificate has expired" };
    }
    return await verifySignatureAgainstPublicKey(cert);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Verification failed: ${message}` };
  }
}

/** Verify chain linkage: delegator of cert[n+1] must match delegate of cert[n]. */
export function verifyDelegationChainLinkage(
  chain: DelegationChain,
): Result<true, string> {
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
        error:
          `Chain broken at index ${i}: delegate "${current.delegate}" does not match next delegator "${next.delegator}"`,
      };
    }
  }
  return { ok: true, value: true };
}
