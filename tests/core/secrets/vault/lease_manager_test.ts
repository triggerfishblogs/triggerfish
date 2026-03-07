/**
 * Lease manager tests — tracking, renewal scheduling, shutdown.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createLeaseManager } from "../../../../src/core/secrets/vault/lease_manager.ts";

Deno.test("lease manager: tracks and lists leases", () => {
  const manager = createLeaseManager(
    {},
    () => Promise.resolve({ ok: true as const, value: { ttlSeconds: 3600 } }),
    () => Promise.resolve({ ok: true as const, value: true as const }),
  );

  manager.trackLease({
    leaseId: "lease-1",
    path: "database/creds/myapp",
    ttlSeconds: 3600,
    renewable: true,
    createdAt: Date.now(),
  });

  const leases = manager.listLeases();
  assertEquals(leases.length, 1);
  assertEquals(leases[0].leaseId, "lease-1");

  manager.shutdown();
});

Deno.test("lease manager: untrackLease removes lease", () => {
  const manager = createLeaseManager(
    {},
    () => Promise.resolve({ ok: true as const, value: { ttlSeconds: 3600 } }),
    () => Promise.resolve({ ok: true as const, value: true as const }),
  );

  manager.trackLease({
    leaseId: "lease-2",
    path: "database/creds/myapp",
    ttlSeconds: 3600,
    renewable: true,
    createdAt: Date.now(),
  });

  manager.untrackLease("lease-2");
  assertEquals(manager.listLeases().length, 0);

  manager.shutdown();
});

Deno.test("lease manager: shutdown clears all leases", () => {
  const manager = createLeaseManager(
    {},
    () => Promise.resolve({ ok: true as const, value: { ttlSeconds: 3600 } }),
    () => Promise.resolve({ ok: true as const, value: true as const }),
  );

  manager.trackLease({
    leaseId: "lease-3a",
    path: "db/creds/a",
    ttlSeconds: 3600,
    renewable: true,
    createdAt: Date.now(),
  });

  manager.trackLease({
    leaseId: "lease-3b",
    path: "db/creds/b",
    ttlSeconds: 3600,
    renewable: true,
    createdAt: Date.now(),
  });

  manager.shutdown();
  assertEquals(manager.listLeases().length, 0);
});

Deno.test("lease manager: non-renewable leases are not scheduled for renewal", () => {
  let renewCalls = 0;
  const manager = createLeaseManager(
    { renewalThreshold: 0.01 },
    () => {
      renewCalls++;
      return Promise.resolve({
        ok: true as const,
        value: { ttlSeconds: 3600 },
      });
    },
    () => Promise.resolve({ ok: true as const, value: true as const }),
  );

  manager.trackLease({
    leaseId: "non-renewable",
    path: "static/secret",
    ttlSeconds: 3600,
    renewable: false,
    createdAt: Date.now(),
  });

  assertEquals(renewCalls, 0);
  manager.shutdown();
});
