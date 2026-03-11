/**
 * Workspace, path classification, and memory system initialization.
 *
 * Creates the main agent workspace, symlinks SPINE.md, builds the
 * filesystem path classifier, and initializes the FTS5 memory store.
 *
 * @module
 */

import { join } from "@std/path";
import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { createWorkspace } from "../../../exec/workspace.ts";
import { createPathClassifier } from "../../../core/security/path_classification.ts";
import { createSqliteStorage } from "../../../core/storage/sqlite.ts";
import { OWNER_MEMORY_AGENT_ID } from "../../../core/types/session.ts";
import type { createSession } from "../../../core/types/session.ts";
import type { LineageStore } from "../../../core/session/lineage_types.ts";
import {
  createFts5SearchProvider,
  createMemoryStore,
  createMemoryToolExecutor,
} from "../../../tools/memory/mod.ts";

/** Create main workspace and symlink SPINE.md into it. */
export async function initializeMainWorkspace(
  baseDir: string,
) {
  const spinePath = join(baseDir, "SPINE.md");
  const mainWorkspace = await createWorkspace({
    agentId: OWNER_MEMORY_AGENT_ID,
    basePath: join(baseDir, "workspaces"),
  });
  try {
    const workspaceSpine = join(mainWorkspace.path, "SPINE.md");
    try {
      await Deno.remove(workspaceSpine);
    } catch { /* doesn't exist yet */ }
    await Deno.symlink(spinePath, workspaceSpine);
  } catch { /* SPINE.md may not exist yet — not fatal */ }
  return { spinePath, mainWorkspace };
}

/** Build path classifier for a workspace with filesystem security config. */
export function buildMainPathClassifier(
  fsPathMap: Map<string, ClassificationLevel>,
  fsDefault: ClassificationLevel,
  mainWorkspace: Awaited<ReturnType<typeof createWorkspace>>,
  opts?: { readonly resolveCwd?: () => string },
) {
  return createPathClassifier(
    { paths: fsPathMap, defaultClassification: fsDefault },
    {
      basePath: mainWorkspace.path,
      publicPath: mainWorkspace.publicPath,
      internalPath: mainWorkspace.internalPath,
      confidentialPath: mainWorkspace.confidentialPath,
      restrictedPath: mainWorkspace.restrictedPath,
    },
    opts?.resolveCwd ? { resolveCwd: opts.resolveCwd } : undefined,
  );
}

/** Options for initializing the memory system. */
export interface InitializeMemoryOptions {
  readonly dataDir: string;
  readonly storage: ReturnType<typeof createSqliteStorage>;
  readonly session: ReturnType<typeof createSession>;
  readonly lineageStore?: LineageStore;
}

/** Initialize memory system with FTS5 search. */
export async function initializeMemorySystem(
  opts: InitializeMemoryOptions,
) {
  const { Database } = await import("@db/sqlite");
  const memoryDb = new Database(join(opts.dataDir, "triggerfish.db"));
  memoryDb.exec("PRAGMA journal_mode=WAL");
  const memorySearchProvider = createFts5SearchProvider(memoryDb);
  const memoryStore = createMemoryStore({
    storage: opts.storage,
    searchProvider: memorySearchProvider,
  });
  const memoryExecutor = createMemoryToolExecutor({
    store: memoryStore,
    searchProvider: memorySearchProvider,
    agentId: OWNER_MEMORY_AGENT_ID,
    sessionTaint: opts.session.taint,
    sourceSessionId: opts.session.id,
    lineageStore: opts.lineageStore,
  });
  return { memoryDb, memoryStore, memorySearchProvider, memoryExecutor };
}
