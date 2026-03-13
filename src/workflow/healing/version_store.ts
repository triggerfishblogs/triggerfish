/**
 * Workflow version store — full-snapshot versioning with approval lifecycle.
 *
 * Versions are stored as complete definition snapshots. The lead agent
 * cannot modify the self_healing config block — the validator rejects
 * any proposed version that differs from the canonical config.
 * @module
 */

import type { StorageProvider } from "../../core/storage/provider.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import { canFlowTo } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/logger.ts";
import type { ParseResult } from "../parser.ts";
import { err, ok, parseWorkflowYaml } from "../parser.ts";
import type { WorkflowStore } from "../store.ts";
import type { VersionStatus, WorkflowVersion } from "./types.ts";

const log = createLogger("workflow-version-store");

const VERSION_PREFIX = "workflow-versions:";

/** Options for proposing a new workflow version. */
export interface ProposeVersionOptions {
  readonly workflowName: string;
  readonly agentId: string;
  readonly definition: string;
  readonly diff: string;
  readonly source: "human" | "self_healing";
  readonly authorReasoning: string;
  readonly runId?: string;
  readonly classification: ClassificationLevel;
}

/** Workflow version store for proposal/approval lifecycle. */
export interface WorkflowVersionStore {
  /** Create a PROPOSED version. Validates config immutability for self_healing source. */
  proposeWorkflowVersion(
    options: ProposeVersionOptions,
  ): Promise<ParseResult<WorkflowVersion>>;

  /** Approve a proposed version — saves to main WorkflowStore and supersedes prior. */
  approveWorkflowVersion(
    versionId: string,
    reviewedBy: string,
  ): Promise<ParseResult<WorkflowVersion>>;

  /** Reject a proposed version — preserved for future lead context. */
  rejectWorkflowVersion(
    versionId: string,
    reviewedBy: string,
    reason: string,
  ): Promise<ParseResult<WorkflowVersion>>;

  /** List all versions for a workflow, filtered by classification. */
  listWorkflowVersions(
    workflowName: string,
    sessionTaint: ClassificationLevel,
  ): Promise<readonly WorkflowVersion[]>;

  /** Load a single version by ID, filtered by classification. */
  loadWorkflowVersion(
    versionId: string,
    sessionTaint: ClassificationLevel,
  ): Promise<WorkflowVersion | null>;

  /** Load all REJECTED proposals for a workflow (for lead context). */
  loadRejectedProposals(
    workflowName: string,
  ): Promise<readonly WorkflowVersion[]>;
}

/** Create a WorkflowVersionStore backed by StorageProvider. */
export function createWorkflowVersionStore(options: {
  readonly storage: StorageProvider;
  readonly workflowStore: WorkflowStore;
}): WorkflowVersionStore {
  const { storage, workflowStore } = options;

  return {
    proposeWorkflowVersion: (opts) => proposeVersion(storage, workflowStore, opts),
    approveWorkflowVersion: (id, by) => approveVersion(storage, workflowStore, id, by),
    rejectWorkflowVersion: (id, by, reason) => rejectVersion(storage, id, by, reason),
    listWorkflowVersions: (name, taint) => listVersions(storage, name, taint),
    loadWorkflowVersion: (id, taint) => loadVersion(storage, id, taint),
    loadRejectedProposals: (name) => loadRejected(storage, name),
  };
}

// --- Internal implementations ---

async function proposeVersion(
  storage: StorageProvider,
  workflowStore: WorkflowStore,
  opts: ProposeVersionOptions,
): Promise<ParseResult<WorkflowVersion>> {
  if (opts.source === "self_healing") {
    const configCheck = await validateConfigImmutability(
      workflowStore,
      opts.workflowName,
      opts.definition,
      opts.classification,
    );
    if (!configCheck.ok) return configCheck;
  }

  const versionNumber = await computeNextVersionNumber(storage, opts.workflowName);

  await supersedeExistingProposals(storage, opts.workflowName);

  const version: WorkflowVersion = {
    versionId: crypto.randomUUID(),
    workflowName: opts.workflowName,
    agentId: opts.agentId,
    versionNumber,
    definition: opts.definition,
    diff: opts.diff,
    status: "PROPOSED",
    source: opts.source,
    authorReasoning: opts.authorReasoning,
    runId: opts.runId,
    proposedAt: new Date().toISOString(),
  };

  await saveVersion(storage, version, opts.classification);

  log.info("Workflow version proposed", {
    operation: "proposeWorkflowVersion",
    workflowName: opts.workflowName,
    versionId: version.versionId,
    versionNumber,
    source: opts.source,
  });

  return ok(version);
}

async function approveVersion(
  storage: StorageProvider,
  workflowStore: WorkflowStore,
  versionId: string,
  reviewedBy: string,
): Promise<ParseResult<WorkflowVersion>> {
  const record = await loadVersionRecord(storage, versionId);
  if (!record) {
    return err(`Workflow version not found: ${versionId}`);
  }

  if (record.version.status !== "PROPOSED") {
    return err(
      `Workflow version cannot be approved: current status is ${record.version.status}`,
    );
  }

  const approved: WorkflowVersion = {
    ...record.version,
    status: "APPROVED",
    resolvedAt: new Date().toISOString(),
    resolvedBy: reviewedBy,
  };

  await saveVersion(storage, approved, record.classification);

  const parsed = parseWorkflowYaml(approved.definition);
  if (parsed.ok) {
    await workflowStore.saveWorkflowDefinition(
      approved.workflowName,
      approved.definition,
      record.classification,
    );
  }

  log.info("Workflow version approved", {
    operation: "approveWorkflowVersion",
    versionId,
    workflowName: approved.workflowName,
    reviewedBy,
  });

  return ok(approved);
}

async function rejectVersion(
  storage: StorageProvider,
  versionId: string,
  reviewedBy: string,
  reason: string,
): Promise<ParseResult<WorkflowVersion>> {
  const record = await loadVersionRecord(storage, versionId);
  if (!record) {
    return err(`Workflow version not found: ${versionId}`);
  }

  if (record.version.status !== "PROPOSED") {
    return err(
      `Workflow version cannot be rejected: current status is ${record.version.status}`,
    );
  }

  const rejected: WorkflowVersion = {
    ...record.version,
    status: "REJECTED",
    resolvedAt: new Date().toISOString(),
    resolvedBy: `${reviewedBy}: ${reason}`,
  };

  await saveVersion(storage, rejected, record.classification);

  log.info("Workflow version rejected", {
    operation: "rejectWorkflowVersion",
    versionId,
    workflowName: rejected.workflowName,
    reviewedBy,
    reason,
  });

  return ok(rejected);
}

async function listVersions(
  storage: StorageProvider,
  workflowName: string,
  sessionTaint: ClassificationLevel,
): Promise<readonly WorkflowVersion[]> {
  const keys = await storage.list(`${VERSION_PREFIX}${workflowName}:`);
  const versions: WorkflowVersion[] = [];

  for (const key of keys) {
    const raw = await storage.get(key);
    if (!raw) continue;
    const record = JSON.parse(raw) as VersionRecord;
    if (!canFlowTo(record.classification, sessionTaint)) continue;
    versions.push(record.version);
  }

  return versions.sort((a, b) => b.versionNumber - a.versionNumber);
}

async function loadVersion(
  storage: StorageProvider,
  versionId: string,
  sessionTaint: ClassificationLevel,
): Promise<WorkflowVersion | null> {
  const keys = await storage.list(VERSION_PREFIX);
  for (const key of keys) {
    if (!key.includes(versionId)) continue;
    const raw = await storage.get(key);
    if (!raw) continue;
    const record = JSON.parse(raw) as VersionRecord;
    if (record.version.versionId !== versionId) continue;
    if (!canFlowTo(record.classification, sessionTaint)) {
      log.warn("Workflow version load denied: classification exceeds session taint", {
        operation: "loadWorkflowVersion",
        versionId,
        classification: record.classification,
        sessionTaint,
      });
      return null;
    }
    return record.version;
  }
  return null;
}

async function loadRejected(
  storage: StorageProvider,
  workflowName: string,
): Promise<readonly WorkflowVersion[]> {
  const keys = await storage.list(`${VERSION_PREFIX}${workflowName}:`);
  const rejected: WorkflowVersion[] = [];

  for (const key of keys) {
    const raw = await storage.get(key);
    if (!raw) continue;
    const record = JSON.parse(raw) as VersionRecord;
    if (record.version.status === "REJECTED") {
      rejected.push(record.version);
    }
  }

  return rejected.sort((a, b) => b.versionNumber - a.versionNumber);
}

// --- Helpers ---

interface VersionRecord {
  readonly version: WorkflowVersion;
  readonly classification: ClassificationLevel;
}

function storageKey(workflowName: string, versionId: string): string {
  return `${VERSION_PREFIX}${workflowName}:${versionId}`;
}

async function saveVersion(
  storage: StorageProvider,
  version: WorkflowVersion,
  classification: ClassificationLevel,
): Promise<void> {
  const record: VersionRecord = { version, classification };
  await storage.set(
    storageKey(version.workflowName, version.versionId),
    JSON.stringify(record),
  );
}

async function loadVersionRecord(
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

async function computeNextVersionNumber(
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

async function supersedeExistingProposals(
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

async function validateConfigImmutability(
  workflowStore: WorkflowStore,
  workflowName: string,
  proposedDefinition: string,
  sessionTaint: ClassificationLevel,
): Promise<ParseResult<void>> {
  const canonical = await workflowStore.loadWorkflowDefinition(
    workflowName,
    sessionTaint,
  );
  if (!canonical) return ok(undefined);

  const canonicalConfig = extractSelfHealingBlock(canonical.yaml);
  const proposedConfig = extractSelfHealingBlock(proposedDefinition);

  if (JSON.stringify(canonicalConfig) !== JSON.stringify(proposedConfig)) {
    log.warn("Self-healing config mutation rejected in version proposal", {
      operation: "validateConfigImmutability",
      workflowName,
    });
    return err(
      `Workflow version rejected: self_healing config block must not be modified by lead agent`,
    );
  }

  return ok(undefined);
}

function extractSelfHealingBlock(yaml: string): unknown {
  const parsed = parseWorkflowYaml(yaml);
  if (!parsed.ok) return null;
  const meta = parsed.value.metadata;
  if (!meta) return null;
  const tf = meta["triggerfish"];
  if (typeof tf !== "object" || tf === null) return null;
  return (tf as Record<string, unknown>)["self_healing"] ?? null;
}
