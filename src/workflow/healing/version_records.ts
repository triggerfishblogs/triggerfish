/**
 * Workflow version record storage — low-level persistence helpers for
 * version records backed by StorageProvider.
 * @module
 */

import type { StorageProvider } from "../../core/storage/provider.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { VersionStatus, WorkflowVersion } from "./types.ts";

const VERSION_PREFIX = "workflow-versions:";

/** Internal storage envelope for a workflow version with classification. */
export interface VersionRecord {
  readonly version: WorkflowVersion;
  readonly classification: ClassificationLevel;
}

/** Build a storage key for a workflow version. */
export function buildVersionStorageKey(
  workflowName: string,
  versionId: string,
): string {
  return `${VERSION_PREFIX}${workflowName}:${versionId}`;
}

/** Return the shared key prefix for all workflow versions. */
export function versionKeyPrefix(): string {
  return VERSION_PREFIX;
}

/** Return the key prefix scoped to a specific workflow. */
export function workflowVersionKeyPrefix(workflowName: string): string {
  return `${VERSION_PREFIX}${workflowName}:`;
}

/** Persist a version record to storage. */
export async function saveVersionRecord(
  storage: StorageProvider,
  version: WorkflowVersion,
  classification: ClassificationLevel,
): Promise<void> {
  const record: VersionRecord = { version, classification };
  await storage.set(
    buildVersionStorageKey(version.workflowName, version.versionId),
    JSON.stringify(record),
  );
}

/** Load a single version record by ID (scans all keys). */
export async function loadVersionRecordById(
  storage: StorageProvider,
  versionId: string,
): Promise<VersionRecord | null> {
  const keys = await storage.list(VERSION_PREFIX);
  for (const key of keys) {
    if (!key.includes(versionId)) continue;
    const raw = await storage.get(key);
    if (!raw) continue;
    const record = JSON.parse(raw) as VersionRecord;
    if (record.version.versionId === versionId) return record;
  }
  return null;
}

/** Compute the next version number for a workflow. */
export async function computeNextVersionNumber(
  storage: StorageProvider,
  workflowName: string,
): Promise<number> {
  const keys = await storage.list(`${VERSION_PREFIX}${workflowName}:`);
  let max = 0;
  for (const key of keys) {
    const raw = await storage.get(key);
    if (!raw) continue;
    const record = JSON.parse(raw) as VersionRecord;
    if (record.version.versionNumber > max) {
      max = record.version.versionNumber;
    }
  }
  return max + 1;
}

/** Mark all PROPOSED versions for a workflow as SUPERSEDED. */
export async function supersedeExistingProposals(
  storage: StorageProvider,
  workflowName: string,
): Promise<void> {
  const keys = await storage.list(`${VERSION_PREFIX}${workflowName}:`);
  for (const key of keys) {
    const raw = await storage.get(key);
    if (!raw) continue;
    const record = JSON.parse(raw) as VersionRecord;
    if (record.version.status === "PROPOSED") {
      const superseded: VersionRecord = {
        ...record,
        version: {
          ...record.version,
          status: "SUPERSEDED" as VersionStatus,
          resolvedAt: new Date().toISOString(),
          resolvedBy: "system",
        },
      };
      await storage.set(key, JSON.stringify(superseded));
    }
  }
}
