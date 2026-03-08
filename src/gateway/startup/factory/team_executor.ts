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
    const channelId = `team-member-${options.role}-${Date.now()}`;

    log.info("Spawning team member session", {
      operation: "spawnMemberSession",
      role: options.role,
      channelId,
    });

    const { orchestrator, session } = await factory.create(channelId, {
      ceiling: options.classificationCeiling,
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

/**
 * Build sendMessage that actually delivers via executeAgentTurn.
 *
 * For messages to team members (in the registry), calls the orchestrator
 * directly. For messages to sessions outside the team (e.g. creator
 * notifications), falls back to sessions_send write-down check only.
 */
function buildSendMessage(
  registry: ReturnType<typeof createSessionRegistry>,
  sessionManager: EnhancedSessionManager,
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
      // Target is a live team member — deliver via orchestrator.
      log.info("Delivering message to team member", {
        operation: "sendMessage",
        fromId,
        toId,
        contentLength: content.length,
      });

      const result = await live.orchestrator.executeAgentTurn({
        session: live.session,
        message: content,
        targetClassification: live.session.taint,
      });

      if (!result.ok) {
        log.error("Team member message processing failed", {
          operation: "sendMessage",
          toId,
          err: result.error,
        });
        return { ok: false, error: `Message delivery failed: ${result.error}` };
      }

      return { ok: true, value: { delivered: true } };
    }

    // Target is not in the live registry — use sessionManager for
    // write-down check (external session, e.g. creator notification).
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
  const sendMessage = buildSendMessage(registry, opts.sessionManager);

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
