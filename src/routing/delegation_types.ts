/**
 * Type definitions for agent delegation chains.
 *
 * Defines the certificate, chain, keypair, and service interfaces
 * used for Ed25519-signed multi-agent trust propagation.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";

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
