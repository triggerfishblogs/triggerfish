/**
 * Team executor factory — wires TeamManager to real gateway infrastructure.
 *
 * Manages the full lifecycle of team member sessions: spawning via
 * OrchestratorFactory, registering with EnhancedSessionManager, delivering
 * messages by invoking the orchestrator's executeAgentTurn, and tracking
 * taint from live session state.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { Result } from "../../../core/types/classification.ts";
import { canFlowTo } from "../../../core/types/classification.ts";
import type { SessionId, SessionState } from "../../../core/types/session.ts";
import type { StorageProvider } from "../../../core/storage/provider.ts";
import type { Orchestrator } from "../../../core/types/orchestrator.ts";
import type { OrchestratorFactory } from "../../../scheduler/service_types.ts";
import type { EnhancedSessionManager } from "../../sessions.ts";
import {
  createTeamManager,
  type SpawnMemberOptions,
  type SpawnedMember,
  type TeamManager,
} from "../../../agent/team/manager.ts";
import {
  createTeamToolExecutor,
  type TeamToolContext,
} from "../../../agent/team/tools.ts";
import {
  TEAM_STORAGE_PREFIX,
  type TeamInstance,
} from "../../../agent/team/types.ts";
import type { SubsystemExecutor } from "../../tools/executor/executor_types.ts";
import { createLogger } from "../../../core/logger/logger.ts";

const log = createLogger("team-wiring");

// ─── Live session tracking ──────────────────────────────────────────────────

/** Live state for a single team member session. */
interface LiveMemberSession {
  readonly orchestrator: Orchestrator;
  session: SessionState;
}

/**
 * Registry of live team member sessions.
 *
 * Holds orchestrator references and mutable session state so that
 * messages can be delivered (via executeAgentTurn) and taint can
 * be read from the live in-memory state.
 */
function createSessionRegistry() {
  const sessions = new Map<string, LiveMemberSession>();

  return {
    register(
      sessionId: SessionId,
      orchestrator: Orchestrator,
      session: SessionState,
    ): void {
      sessions.set(sessionId as string, { orchestrator, session });
    },

    get(sessionId: SessionId): LiveMemberSession | undefined {
      return sessions.get(sessionId as string);
    },

    remove(sessionId: SessionId): void {
      sessions.delete(sessionId as string);
    },

    clear(): void {
      sessions.clear();
    },
  };
}

// ─── TeamManagerDeps builders ───────────────────────────────────────────────

/** Build spawnMemberSession that creates + registers sessions. */
function buildSpawnMemberSession(
  factory: OrchestratorFactory,
  registry: ReturnType<typeof createSessionRegistry>,
): (options: SpawnMemberOptions) => Promise<SpawnedMember> {
  return async (options: SpawnMemberOptions): Promise<SpawnedMember> => {
    const channelId = `team-member-${options.role}-${crypto.randomUUID()}`;

    log.info("Spawning team member session", {
      operation: "spawnMemberSession",
      role: options.role,
      channelId,
    });

    const { orchestrator, session } = await factory.create(channelId, {
      ceiling: options.classificationCeiling,
      systemPromptSections: options.teamRosterPrompt
        ? [options.teamRosterPrompt]
        : undefined,
    });

    // Track in live registry for message delivery and taint reads.
    // The session lives in-memory only — the registry is the source
    // of truth for team member sessions, not EnhancedSessionManager.
    registry.register(session.id, orchestrator, session);

    log.info("Team member session spawned", {
      operation: "spawnMemberSession",
      role: options.role,
      sessionId: session.id,
    });

    return {
      sessionId: session.id,
      model: options.model ?? "default",
    };
  };
}

/** Max length for lastOutput stored per member. */
const MAX_LAST_OUTPUT_LENGTH = 500;

/** Regex to strip `<think>...</think>` tags from LLM output. */
const THINK_TAG_REGEX = /<think>[\s\S]*?<\/think>/g;

/** Strip thinking tags and leading whitespace from LLM output. */
function stripThinkingTags(output: string): string {
  return output.replace(THINK_TAG_REGEX, "").trimStart();
}

/**
 * Update a member's lastOutput and lastActivityAt in persisted team state.
 *
 * Scans all teams in storage to find the member by sessionId, then
 * patches the member record. This is best-effort — failures are logged.
 */
async function persistMemberOutput(
  storage: StorageProvider,
  sessionId: SessionId,
  output: string,
): Promise<void> {
  const keys = await storage.list(`${TEAM_STORAGE_PREFIX}`);
  for (const key of keys) {
    const raw = await storage.get(key);
    if (!raw) continue;

    const team: TeamInstance = JSON.parse(raw);
    const idx = team.members.findIndex(
      (m) => (m.sessionId as string) === (sessionId as string),
    );
    if (idx === -1) continue;

    const cleaned = stripThinkingTags(output);
    const truncated = cleaned.length > MAX_LAST_OUTPUT_LENGTH
      ? cleaned.slice(0, MAX_LAST_OUTPUT_LENGTH) + "..."
      : cleaned;
    const updated = {
      ...team,
      members: team.members.map((m, i) =>
        i === idx
          ? { ...m, lastOutput: truncated, lastActivityAt: new Date() }
          : m
      ),
    };
    await storage.set(key, JSON.stringify(updated));
    return;
  }
}

/** Resolve the sender's current taint from the registry or session manager. */
async function resolveSenderTaint(
  senderId: SessionId,
  registry: ReturnType<typeof createSessionRegistry>,
  sessionManager: EnhancedSessionManager,
): Promise<ClassificationLevel | null> {
  const liveSender = registry.get(senderId);
  if (liveSender) return liveSender.session.taint;

  const persisted = await sessionManager.get(senderId);
  return persisted?.taint ?? null;
}

/**
 * Build sendMessage that delivers via executeAgentTurn (fire-and-forget).
 *
 * For messages to team members (in the registry), queues delivery via
 * the orchestrator in the background and returns immediately. The member's
 * lastOutput is updated in storage after the turn completes, so
 * team_status can report progress.
 *
 * For messages to sessions outside the team (e.g. creator notifications),
 * falls back to sessions_send write-down check only.
 */
function buildSendMessage(
  registry: ReturnType<typeof createSessionRegistry>,
  sessionManager: EnhancedSessionManager,
  storage: StorageProvider,
): (
  fromId: SessionId,
  toId: SessionId,
  content: string,
) => Promise<Result<{ readonly delivered: true }, string>> {
  return async (
    fromId: SessionId,
    toId: SessionId,
    content: string,
  ): Promise<Result<{ readonly delivered: true }, string>> => {
    const live = registry.get(toId);

    if (live) {
      // Enforce write-down rule: sender's taint must flow to target's taint.
      // Without this check, a CONFIDENTIAL session could send data to a
      // PUBLIC team member, violating the no-write-down invariant.
      const senderTaint = await resolveSenderTaint(
        fromId,
        registry,
        sessionManager,
      );
      if (senderTaint && !canFlowTo(senderTaint, live.session.taint)) {
        log.warn("Write-down blocked for team member delivery", {
          operation: "sendMessage",
          fromId,
          toId,
          senderTaint,
          targetTaint: live.session.taint,
        });
        return {
          ok: false,
          error: `Write-down blocked: ${senderTaint} cannot flow to ${live.session.taint}`,
        };
      }

      log.info("Queuing message delivery to team member", {
        operation: "sendMessage",
        fromId,
        toId,
        senderTaint,
        targetTaint: live.session.taint,
        contentLength: content.length,
      });

      live.orchestrator.executeAgentTurn({
        session: live.session,
        message: content,
        targetClassification: live.session.taint,
      })
        .then(async (result) => {
          if (!result.ok) {
            log.error("Team member message processing failed", {
              operation: "sendMessage",
              toId,
              err: result.error,
            });
            return;
          }
          // Persist the member's output so team_status can report it.
          await persistMemberOutput(storage, toId, result.value.response);
        })
        .catch((err) => {
          log.error("Team member message delivery threw", {
            operation: "sendMessage",
            toId,
            err,
          });
        });

      return { ok: true, value: { delivered: true } };
    }

    // Target is not in the live registry — route via sessionManager
    // which enforces write-down checks for external sessions.
    log.info("Routing message to external session via sessionManager", {
      operation: "sendMessage",
      fromId,
      toId,
    });
    const target = await sessionManager.get(toId);
    if (!target) {
      return { ok: false, error: `Target session not found: ${toId}` };
    }

    return sessionManager.sessionsSend(fromId, toId, content, target.taint);
  };
}

/** Build getSessionTaint from live registry (preferred) or sessionManager. */
function buildGetSessionTaint(
  registry: ReturnType<typeof createSessionRegistry>,
  sessionManager: EnhancedSessionManager,
): (sessionId: SessionId) => Promise<ClassificationLevel | null> {
  return async (sessionId: SessionId): Promise<ClassificationLevel | null> => {
    const live = registry.get(sessionId);
    if (live) return live.session.taint;

    const persisted = await sessionManager.get(sessionId);
    return persisted?.taint ?? null;
  };
}

/** Build terminateSession that cleans up both registry and sessionManager. */
function buildTerminateSession(
  registry: ReturnType<typeof createSessionRegistry>,
  sessionManager: EnhancedSessionManager,
): (sessionId: SessionId) => Promise<void> {
  return async (sessionId: SessionId): Promise<void> => {
    log.info("Terminating team member session", {
      operation: "terminateSession",
      sessionId,
    });
    registry.remove(sessionId);
    await sessionManager.delete(sessionId);
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Options for building the team executor. */
export interface TeamExecutorOptions {
  /** Storage for persisting team state. */
  readonly storage: StorageProvider;
  /** Factory for spawning isolated agent sessions. */
  readonly orchestratorFactory: OrchestratorFactory;
  /** Session manager for taint queries and termination. */
  readonly sessionManager: EnhancedSessionManager;
  /** Caller's session ID (injected, not from LLM). */
  readonly callerSessionId: SessionId;
  /** Live taint getter for the caller session. */
  readonly getCallerTaint: () => ClassificationLevel;
}

/**
 * Build a TeamManager wired to real gateway infrastructure.
 *
 * Creates a live session registry and composes OrchestratorFactory,
 * EnhancedSessionManager, and direct orchestrator invocation into
 * the TeamManagerDeps interface expected by createTeamManager.
 */
export function buildTeamManager(opts: {
  readonly storage: StorageProvider;
  readonly orchestratorFactory: OrchestratorFactory;
  readonly sessionManager: EnhancedSessionManager;
  readonly callerSessionId: SessionId;
}): TeamManager {
  const registry = createSessionRegistry();
  const sendMessage = buildSendMessage(registry, opts.sessionManager, opts.storage);

  return createTeamManager({
    storage: opts.storage,
    spawnMemberSession: buildSpawnMemberSession(
      opts.orchestratorFactory,
      registry,
    ),
    sendMessage,
    getSessionTaint: buildGetSessionTaint(registry, opts.sessionManager),
    terminateSession: buildTerminateSession(registry, opts.sessionManager),
    notifyCreator: async (creatorSessionId: SessionId, message: string) => {
      log.info("Notifying team creator", {
        operation: "notifyCreator",
        creatorSessionId,
        preview: message.slice(0, 100),
      });
      await sendMessage(opts.callerSessionId, creatorSessionId, message);
    },
  });
}

/**
 * Build the team tool executor for the main session.
 *
 * Returns a SubsystemExecutor that handles team_create, team_status,
 * team_disband, and team_message tool calls.
 */
export function buildTeamExecutor(
  opts: TeamExecutorOptions,
): SubsystemExecutor {
  const teamManager = buildTeamManager({
    storage: opts.storage,
    orchestratorFactory: opts.orchestratorFactory,
    sessionManager: opts.sessionManager,
    callerSessionId: opts.callerSessionId,
  });

  const ctx: TeamToolContext = {
    teamManager,
    callerSessionId: opts.callerSessionId,
    getCallerTaint: opts.getCallerTaint,
  };

  return createTeamToolExecutor(ctx);
}
