/**
 * Agent delegation service factory.
 *
 * Assembles a DelegationService backed by a StorageProvider,
 * wiring together crypto operations and chain storage persistence.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import type { StorageProvider } from "../core/storage/provider.ts";
import type {
  DelegationChain,
  DelegationService,
} from "./delegation_types.ts";
import {
  generateDelegationKeypair,
  signDelegationCertificate,
  verifyDelegationCertificate,
  verifyDelegationChainLinkage,
} from "./delegation_crypto.ts";
import {
  deserialiseDelegationChain,
  serialiseDelegationChain,
} from "./delegation_codec.ts";

export type {
  DelegationCertificate,
  DelegationChain,
  DelegationKeypair,
  DelegationService,
  UnsignedCertificate,
} from "./delegation_types.ts";

/** Storage key namespace for delegation chains. */
const NAMESPACE = "delegation:";

/** Verify every certificate in the chain, then check linkage. */
async function verifyDelegationChain(
  chain: DelegationChain,
): Promise<Result<true, string>> {
  if (chain.certificates.length === 0) {
    return { ok: false, error: "Delegation chain is empty" };
  }
  for (let i = 0; i < chain.certificates.length; i++) {
    const result = await verifyDelegationCertificate(chain.certificates[i]);
    if (!result.ok) {
      return {
        ok: false,
        error: `Certificate at index ${i} is invalid: ${result.error}`,
      };
    }
  }
  return verifyDelegationChainLinkage(chain);
}

/** Persist a delegation chain to storage under the given ID. */
async function storeDelegationChain(
  storage: StorageProvider,
  chainId: string,
  chain: DelegationChain,
): Promise<Result<true, string>> {
  try {
    await storage.set(
      `${NAMESPACE}${chainId}`,
      serialiseDelegationChain(chain),
    );
    return { ok: true, value: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Failed to store chain: ${message}` };
  }
}

/** Load a delegation chain from storage by ID. */
async function loadDelegationChain(
  storage: StorageProvider,
  chainId: string,
): Promise<Result<DelegationChain, string>> {
  try {
    const raw = await storage.get(`${NAMESPACE}${chainId}`);
    if (raw === null || raw === undefined) {
      return { ok: false, error: `Chain not found: ${chainId}` };
    }
    return { ok: true, value: deserialiseDelegationChain(raw) };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Failed to load chain: ${message}` };
  }
}

/**
 * Create a delegation service backed by a StorageProvider.
 *
 * All delegation chains are stored under the `delegation:` key namespace.
 */
export function createDelegationService(
  storage: StorageProvider,
): DelegationService {
  return {
    generateKeypair: generateDelegationKeypair,
    signCertificate: signDelegationCertificate,
    verifyCertificate: verifyDelegationCertificate,
    verifyChain: verifyDelegationChain,
    storeChain: (chainId, chain) =>
      storeDelegationChain(storage, chainId, chain),
    loadChain: (chainId) => loadDelegationChain(storage, chainId),
  };
}
