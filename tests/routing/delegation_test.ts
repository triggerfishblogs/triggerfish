/**
 * Tests for agent delegation chains (Group 6b).
 *
 * Verifies Ed25519 keypair generation, certificate signing/verification,
 * and full chain validation including expiry and linkage checks.
 */
import { assert, assertEquals } from "@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import {
  createDelegationService,
  type DelegationChain,
  type DelegationCertificate,
  type UnsignedCertificate,
} from "../../src/routing/delegation.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a date one hour in the future. */
function futureExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000);
}

/** Return a date one hour in the past. */
function pastExpiry(): Date {
  return new Date(Date.now() - 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Keypair generation
// ---------------------------------------------------------------------------

Deno.test("DelegationService: generateKeypair returns valid keys", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  const result = await service.generateKeypair();
  assert(result.ok, `Expected ok but got error: ${!result.ok && result.error}`);

  const keypair = result.value;
  assert(keypair.publicKey instanceof CryptoKey, "publicKey should be a CryptoKey");
  assert(keypair.privateKey instanceof CryptoKey, "privateKey should be a CryptoKey");

  // Verify the key types
  assertEquals(keypair.publicKey.type, "public");
  assertEquals(keypair.privateKey.type, "private");

  // Verify the keys are extractable
  assert(keypair.publicKey.extractable, "publicKey should be extractable");
  assert(keypair.privateKey.extractable, "privateKey should be extractable");

  await storage.close();
});

// ---------------------------------------------------------------------------
// Sign and verify round-trip
// ---------------------------------------------------------------------------

Deno.test("DelegationService: sign and verify certificate round-trips", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  const keypairResult = await service.generateKeypair();
  assert(keypairResult.ok);
  const keypair = keypairResult.value;

  const unsigned: UnsignedCertificate = {
    delegator: "agent-root",
    delegate: "agent-child",
    permissions: ["read", "write"],
    expiry: futureExpiry(),
  };

  const signResult = await service.signCertificate(keypair.privateKey, unsigned);
  assert(signResult.ok, `Sign failed: ${!signResult.ok && signResult.error}`);
  const cert = signResult.value;

  // Fields preserved
  assertEquals(cert.delegator, "agent-root");
  assertEquals(cert.delegate, "agent-child");
  assertEquals(cert.permissions, ["read", "write"]);
  assert(cert.signature.length > 0, "signature must be non-empty");
  assert(cert.publicKey.length > 0, "publicKey must be non-empty");

  // Verify passes
  const verifyResult = await service.verifyCertificate(cert);
  assert(verifyResult.ok, `Verify failed: ${!verifyResult.ok && verifyResult.error}`);

  await storage.close();
});

// ---------------------------------------------------------------------------
// Tampered certificate
// ---------------------------------------------------------------------------

Deno.test("DelegationService: verify rejects tampered certificate", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  const keypairResult = await service.generateKeypair();
  assert(keypairResult.ok);

  const unsigned: UnsignedCertificate = {
    delegator: "agent-root",
    delegate: "agent-child",
    permissions: ["read"],
    expiry: futureExpiry(),
  };

  const signResult = await service.signCertificate(keypairResult.value.privateKey, unsigned);
  assert(signResult.ok);
  const cert = signResult.value;

  // Tamper: change the delegate
  const tampered: DelegationCertificate = {
    ...cert,
    delegate: "agent-evil",
  };

  const verifyResult = await service.verifyCertificate(tampered);
  assert(!verifyResult.ok, "Tampered certificate should fail verification");
  assert(
    verifyResult.error.includes("Invalid certificate signature"),
    `Expected signature error but got: ${verifyResult.error}`,
  );

  await storage.close();
});

// ---------------------------------------------------------------------------
// Expired certificate
// ---------------------------------------------------------------------------

Deno.test("DelegationService: verify rejects expired certificate", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  const keypairResult = await service.generateKeypair();
  assert(keypairResult.ok);

  const unsigned: UnsignedCertificate = {
    delegator: "agent-root",
    delegate: "agent-child",
    permissions: ["read"],
    expiry: pastExpiry(),
  };

  const signResult = await service.signCertificate(keypairResult.value.privateKey, unsigned);
  assert(signResult.ok);
  const cert = signResult.value;

  const verifyResult = await service.verifyCertificate(cert);
  assert(!verifyResult.ok, "Expired certificate should fail verification");
  assert(
    verifyResult.error.includes("expired"),
    `Expected expiry error but got: ${verifyResult.error}`,
  );

  await storage.close();
});

// ---------------------------------------------------------------------------
// Chain verification: valid chain
// ---------------------------------------------------------------------------

Deno.test("DelegationService: chain verification succeeds for valid chain", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  // Generate three keypairs: root -> mid -> leaf
  const rootKp = await service.generateKeypair();
  assert(rootKp.ok);
  const midKp = await service.generateKeypair();
  assert(midKp.ok);

  const expiry = futureExpiry();

  // Root delegates to mid
  const cert1Result = await service.signCertificate(rootKp.value.privateKey, {
    delegator: "root-agent",
    delegate: "mid-agent",
    permissions: ["admin"],
    expiry,
  });
  assert(cert1Result.ok);

  // Mid delegates to leaf
  const cert2Result = await service.signCertificate(midKp.value.privateKey, {
    delegator: "mid-agent",
    delegate: "leaf-agent",
    permissions: ["read"],
    expiry,
  });
  assert(cert2Result.ok);

  const chain: DelegationChain = {
    certificates: [cert1Result.value, cert2Result.value],
    root: "root-agent",
    leaf: "leaf-agent",
  };

  const result = await service.verifyChain(chain);
  assert(result.ok, `Chain verification failed: ${!result.ok && result.error}`);

  await storage.close();
});

// ---------------------------------------------------------------------------
// Chain verification: delegator/delegate mismatch
// ---------------------------------------------------------------------------

Deno.test("DelegationService: chain verification fails when delegator/delegate mismatch", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  const rootKp = await service.generateKeypair();
  assert(rootKp.ok);
  const otherKp = await service.generateKeypair();
  assert(otherKp.ok);

  const expiry = futureExpiry();

  // Root delegates to "mid-agent"
  const cert1Result = await service.signCertificate(rootKp.value.privateKey, {
    delegator: "root-agent",
    delegate: "mid-agent",
    permissions: ["admin"],
    expiry,
  });
  assert(cert1Result.ok);

  // But second cert's delegator is "wrong-agent" (should be "mid-agent")
  const cert2Result = await service.signCertificate(otherKp.value.privateKey, {
    delegator: "wrong-agent",
    delegate: "leaf-agent",
    permissions: ["read"],
    expiry,
  });
  assert(cert2Result.ok);

  const chain: DelegationChain = {
    certificates: [cert1Result.value, cert2Result.value],
    root: "root-agent",
    leaf: "leaf-agent",
  };

  const result = await service.verifyChain(chain);
  assert(!result.ok, "Mismatched chain should fail verification");
  assert(
    result.error.includes("Chain broken"),
    `Expected chain-broken error but got: ${result.error}`,
  );

  await storage.close();
});

// ---------------------------------------------------------------------------
// Chain verification: invalid cert in chain
// ---------------------------------------------------------------------------

Deno.test("DelegationService: chain verification fails when any cert in chain is invalid", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  const rootKp = await service.generateKeypair();
  assert(rootKp.ok);
  const midKp = await service.generateKeypair();
  assert(midKp.ok);

  const expiry = futureExpiry();

  // Valid first cert
  const cert1Result = await service.signCertificate(rootKp.value.privateKey, {
    delegator: "root-agent",
    delegate: "mid-agent",
    permissions: ["admin"],
    expiry,
  });
  assert(cert1Result.ok);

  // Valid second cert, but we will tamper with it
  const cert2Result = await service.signCertificate(midKp.value.privateKey, {
    delegator: "mid-agent",
    delegate: "leaf-agent",
    permissions: ["read"],
    expiry,
  });
  assert(cert2Result.ok);

  // Tamper with second cert's permissions
  const tamperedCert2: DelegationCertificate = {
    ...cert2Result.value,
    permissions: ["read", "write", "admin"],
  };

  const chain: DelegationChain = {
    certificates: [cert1Result.value, tamperedCert2],
    root: "root-agent",
    leaf: "leaf-agent",
  };

  const result = await service.verifyChain(chain);
  assert(!result.ok, "Chain with tampered cert should fail verification");
  assert(
    result.error.includes("index 1"),
    `Expected error at index 1 but got: ${result.error}`,
  );

  await storage.close();
});

// ---------------------------------------------------------------------------
// Storage round-trip
// ---------------------------------------------------------------------------

Deno.test("DelegationService: store and load chain round-trips", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  const rootKp = await service.generateKeypair();
  assert(rootKp.ok);

  const expiry = futureExpiry();

  const certResult = await service.signCertificate(rootKp.value.privateKey, {
    delegator: "root-agent",
    delegate: "child-agent",
    permissions: ["execute"],
    expiry,
  });
  assert(certResult.ok);

  const chain: DelegationChain = {
    certificates: [certResult.value],
    root: "root-agent",
    leaf: "child-agent",
  };

  // Store
  const storeResult = await service.storeChain("chain-1", chain);
  assert(storeResult.ok, `Store failed: ${!storeResult.ok && storeResult.error}`);

  // Load
  const loadResult = await service.loadChain("chain-1");
  assert(loadResult.ok, `Load failed: ${!loadResult.ok && loadResult.error}`);

  const loaded = loadResult.value;
  assertEquals(loaded.root, "root-agent");
  assertEquals(loaded.leaf, "child-agent");
  assertEquals(loaded.certificates.length, 1);
  assertEquals(loaded.certificates[0].delegator, "root-agent");
  assertEquals(loaded.certificates[0].delegate, "child-agent");
  assertEquals([...loaded.certificates[0].permissions], ["execute"]);
  assert(loaded.certificates[0].signature.length > 0);
  assert(loaded.certificates[0].publicKey.length > 0);

  // Verify the loaded chain is still cryptographically valid
  const verifyResult = await service.verifyChain(loaded);
  assert(verifyResult.ok, `Loaded chain failed verification: ${!verifyResult.ok && verifyResult.error}`);

  await storage.close();
});

// ---------------------------------------------------------------------------
// Load nonexistent chain
// ---------------------------------------------------------------------------

Deno.test("DelegationService: loadChain returns error for nonexistent chain", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  const result = await service.loadChain("nonexistent");
  assert(!result.ok, "Loading nonexistent chain should fail");
  assert(
    result.error.includes("not found"),
    `Expected not-found error but got: ${result.error}`,
  );

  await storage.close();
});

// ---------------------------------------------------------------------------
// Empty chain
// ---------------------------------------------------------------------------

Deno.test("DelegationService: verifyChain rejects empty chain", async () => {
  const storage = createMemoryStorage();
  const service = createDelegationService(storage);

  const chain: DelegationChain = {
    certificates: [],
    root: "root",
    leaf: "leaf",
  };

  const result = await service.verifyChain(chain);
  assert(!result.ok, "Empty chain should fail verification");
  assert(
    result.error.includes("empty"),
    `Expected empty error but got: ${result.error}`,
  );

  await storage.close();
});
