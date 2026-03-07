/**
 * Vault lease manager for dynamic secrets.
 *
 * Manages the lifecycle of leased secrets (database credentials,
 * PKI certificates) with automatic renewal and revoke-and-refetch
 * on exhausted retries.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import { createLogger } from "../../logger/logger.ts";

const log = createLogger("vault:lease-manager");

/** Options for the lease manager. */
export interface LeaseManagerOptions {
  /** Renew at this fraction of TTL. Default: 0.75. */
  readonly renewalThreshold: number;
  /** Maximum renewal retries before revoke-and-refetch. Default: 3. */
  readonly maxRetries: number;
  /** Behavior on renewal failure. */
  readonly onRenewalFailure: "warn" | "revoke-and-refetch";
}

/** A tracked lease entry. */
export interface LeaseEntry {
  readonly leaseId: string;
  readonly path: string;
  readonly ttlSeconds: number;
  readonly renewable: boolean;
  readonly createdAt: number;
}

/** Lease renewal function type. */
export type LeaseRenewer = (
  leaseId: string,
) => Promise<Result<{ ttlSeconds: number }, string>>;

/** Lease revoke function type. */
export type LeaseRevoker = (
  leaseId: string,
) => Promise<Result<true, string>>;

/** Lease manager interface. */
export interface LeaseManager {
  /** Track a new lease for automatic renewal. */
  readonly trackLease: (entry: LeaseEntry) => void;
  /** Stop tracking a lease. */
  readonly untrackLease: (leaseId: string) => void;
  /** Get all tracked leases. */
  readonly listLeases: () => readonly LeaseEntry[];
  /** Cancel all pending renewals. */
  readonly shutdown: () => void;
}

/**
 * Create a lease manager for dynamic Vault secrets.
 *
 * Tracks leased secrets and schedules automatic renewal at the
 * configured threshold of TTL. On exhausted retries, invokes
 * the configured failure strategy.
 */
export function createLeaseManager(
  options: Partial<LeaseManagerOptions>,
  renewer: LeaseRenewer,
  revoker: LeaseRevoker,
): LeaseManager {
  const renewalThreshold = options.renewalThreshold ?? 0.75;
  const maxRetries = options.maxRetries ?? 3;
  const onRenewalFailure = options.onRenewalFailure ?? "warn";

  const leases = new Map<string, LeaseEntry>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function scheduleRenewal(entry: LeaseEntry): void {
    const delayMs = entry.ttlSeconds * 1000 * renewalThreshold;
    if (delayMs <= 0 || !entry.renewable) return;

    const timer = setTimeout(async () => {
      let retries = 0;

      while (retries < maxRetries) {
        const result = await renewer(entry.leaseId);
        if (result.ok) {
          const updated: LeaseEntry = {
            ...entry,
            ttlSeconds: result.value.ttlSeconds,
            createdAt: Date.now(),
          };
          leases.set(entry.leaseId, updated);
          scheduleRenewal(updated);
          return;
        }
        retries++;
      }

      log.warn("Lease renewal exhausted retries", {
        operation: "scheduleRenewal",
        leaseId: entry.leaseId,
        retries,
        action: onRenewalFailure,
      });

      if (onRenewalFailure === "revoke-and-refetch") {
        const revokeResult = await revoker(entry.leaseId);
        if (!revokeResult.ok) {
          log.warn("Lease revocation failed", {
            operation: "scheduleRenewal",
            leaseId: entry.leaseId,
            err: revokeResult.error,
          });
        }
      }

      leases.delete(entry.leaseId);
      timers.delete(entry.leaseId);
    }, delayMs);

    timers.set(entry.leaseId, timer);
  }

  return {
    trackLease: (entry) => {
      leases.set(entry.leaseId, entry);
      scheduleRenewal(entry);
    },
    untrackLease: (leaseId) => {
      leases.delete(leaseId);
      const timer = timers.get(leaseId);
      if (timer) {
        clearTimeout(timer);
        timers.delete(leaseId);
      }
    },
    listLeases: () => [...leases.values()],
    shutdown: () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
      leases.clear();
    },
  };
}
