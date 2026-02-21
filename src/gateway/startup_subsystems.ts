/**
 * Subsystem setup helpers for gateway startup.
 *
 * Extracts larger setup blocks from the monolithic runStart() function
 * into focused helper functions: Obsidian vault, skill discovery, and
 * the CLI secret prompt callback.
 *
 * @module
 */

import { join } from "@std/path";
import type { ClassificationLevel } from "../core/types/classification.ts";
import type { SessionId, SessionState } from "../core/types/session.ts";
import type { SecretStore } from "../core/secrets/keychain.ts";
import type { SecretPromptCallback } from "../tools/secrets.ts";
import {
  createDailyNoteManager,
  createLinkResolver,
  createNoteStore,
  createObsidianToolExecutor,
  createVaultContext,
} from "../tools/obsidian/mod.ts";
import { createSkillLoader } from "../tools/skills/loader.ts";
import type { Skill, SkillLoader } from "../tools/skills/loader.ts";
import { createLogger } from "../core/logger/mod.ts";

const log = createLogger("startup-subsystems");

// ─── Obsidian vault setup ────────────────────────────────────────────────────

/** Obsidian plugin configuration from triggerfish.yaml. */
export interface ObsidianPluginConfig {
  readonly enabled?: boolean;
  readonly vault_path?: string;
  readonly classification?: string;
  readonly daily_notes?: {
    readonly folder?: string;
    readonly date_format?: string;
    readonly template?: string;
  };
  readonly exclude_folders?: readonly string[];
  readonly folder_classifications?: Readonly<Record<string, string>>;
}

/**
 * Build the Obsidian vault tool executor from config.
 *
 * Returns the executor function or undefined if Obsidian is not configured
 * or the vault cannot be opened.
 */
export async function buildObsidianExecutor(
  obsConfig: ObsidianPluginConfig,
  getSessionTaint: () => ClassificationLevel,
  sessionId: SessionId,
): Promise<
  | ((name: string, input: Record<string, unknown>) => Promise<string | null>)
  | undefined
> {
  if (!obsConfig.enabled || !obsConfig.vault_path) return undefined;

  const vaultResult = await createVaultContext({
    vaultPath: obsConfig.vault_path,
    classification:
      (obsConfig.classification ?? "INTERNAL") as ClassificationLevel,
    dailyNotes: obsConfig.daily_notes
      ? {
        folder: obsConfig.daily_notes.folder ?? "daily",
        dateFormat: obsConfig.daily_notes.date_format ?? "YYYY-MM-DD",
        template: obsConfig.daily_notes.template,
      }
      : undefined,
    excludeFolders: obsConfig.exclude_folders as string[] | undefined,
    folderClassifications: obsConfig.folder_classifications as
      | Record<string, ClassificationLevel>
      | undefined,
  });

  if (!vaultResult.ok) {
    log.error(`Obsidian vault error: ${vaultResult.error}`);
    return undefined;
  }

  const noteStore = createNoteStore(vaultResult.value);
  const executor = createObsidianToolExecutor({
    vaultContext: vaultResult.value,
    noteStore,
    dailyNoteManager: createDailyNoteManager(vaultResult.value, noteStore),
    linkResolver: createLinkResolver(vaultResult.value),
    getSessionTaint,
    sessionId,
  });

  log.info(`Obsidian vault connected: ${obsConfig.vault_path}`);
  return executor;
}

// ─── Skill discovery ─────────────────────────────────────────────────────────

/** Result from discoverSkills. */
export interface SkillDiscoveryResult {
  readonly skills: readonly Skill[];
  readonly loader: SkillLoader;
}

/**
 * Discover skills from bundled, managed, and workspace directories.
 *
 * Returns the discovered skills and the loader instance (needed for
 * the healthcheck and skill tool executors).
 */
export async function discoverSkills(
  baseDir: string,
): Promise<SkillDiscoveryResult> {
  const bundledSkillsDir = join(
    import.meta.dirname ?? ".",
    "..",
    "..",
    "skills",
    "bundled",
  );
  const managedSkillsDir = join(baseDir, "skills");
  const workspaceSkillsDir = join(baseDir, "workspaces", "main", "skills");
  const loader = createSkillLoader({
    directories: [bundledSkillsDir, managedSkillsDir, workspaceSkillsDir],
    dirTypes: {
      [bundledSkillsDir]: "bundled",
      [managedSkillsDir]: "managed",
      [workspaceSkillsDir]: "workspace",
    },
  });

  let skills: readonly Skill[] = [];
  try {
    skills = await loader.discover();
    if (skills.length > 0) {
      log.info(`Discovered ${skills.length} skill(s)`);
    }
  } catch {
    // Skill discovery failure is non-fatal
  }

  return { skills, loader };
}

// ─── CLI secret prompt ───────────────────────────────────────────────────────

/**
 * Create the CLI secret prompt callback.
 *
 * Reads a secret value from the terminal with echo suppressed via raw mode.
 * The prompt writes to stderr so it shows on terminal even when stdout is piped.
 * The entered value never appears in logs or LLM context.
 */
export function createCliSecretPrompt(): SecretPromptCallback {
  return async (
    name: string,
    hint?: string,
  ): Promise<string | null> => {
    const promptText = hint
      ? `Enter value for '${name}' (${hint}): `
      : `Enter value for '${name}': `;
    Deno.stderr.writeSync(new TextEncoder().encode(promptText));

    try {
      Deno.stdin.setRaw(true);
    } catch {
      // setRaw may fail in non-TTY environments; proceed without it.
    }

    const chars: number[] = [];
    const buf = new Uint8Array(1);
    try {
      while (true) {
        const n = await Deno.stdin.read(buf);
        if (n === null) break;
        const byte = buf[0];
        if (byte === 13 || byte === 10) break; // Enter
        if (byte === 3) { // Ctrl-C
          Deno.stderr.writeSync(new TextEncoder().encode("\n"));
          return null;
        }
        if (byte === 127 || byte === 8) { // Backspace
          if (chars.length > 0) chars.pop();
        } else {
          chars.push(byte);
        }
      }
    } finally {
      try {
        Deno.stdin.setRaw(false);
      } catch { /* Ignore */ }
      Deno.stderr.writeSync(new TextEncoder().encode("\n"));
    }
    return new TextDecoder().decode(new Uint8Array(chars));
  };
}
