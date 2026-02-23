/**
 * Group chat management for Triggerfish channels.
 *
 * Handles group chat modes (always, mentioned-only, owner-only),
 * per-group configuration, owner-only command restrictions,
 * and poll creation/voting mechanics.
 *
 * @module
 */

/** Group chat response mode. */
export type GroupMode = "always" | "mentioned-only" | "owner-only";

/** Configuration for a group chat. */
export interface GroupConfig {
  readonly mode: string;
  readonly botName: string;
}

/** Owner command context. */
export interface OwnerContext {
  readonly isOwner: boolean;
}

/** A poll option with vote tracking. */
export interface PollOption {
  readonly label: string;
  readonly votes: ReadonlySet<string>;
}

/** A poll in a group chat. */
export interface Poll {
  readonly id: string;
  readonly groupId: string;
  readonly question: string;
  readonly options: readonly PollOption[];
  readonly createdAt: Date;
  readonly closed: boolean;
}

/** Owner-only commands that require elevated privileges. */
const OWNER_COMMANDS: ReadonlySet<string> = new Set([
  "/reset",
  "/model",
  "/config",
  "/skill",
  "/cron",
  "/status",
]);

/** Group chat manager with poll support. */
export interface GroupManager {
  /** Configure a group's response mode and bot name. */
  configure(groupId: string, config: GroupConfig): void;

  /** Determine whether the agent should respond to a message in a group. */
  shouldRespond(groupId: string, message: string): boolean;

  /** Check if a command is owner-only and the sender is authorized. */
  isOwnerCommand(command: string, context: OwnerContext): boolean;

  /** Create a new poll in a group. */
  createPoll(
    groupId: string,
    question: string,
    options: readonly string[],
  ): Poll;

  /** Cast a vote on a poll. Each voter can only vote once per poll. */
  vote(pollId: string, optionIndex: number, voterId: string): boolean;

  /** Close a poll and return final results. */
  closePoll(pollId: string): Poll | undefined;

  /** Get a poll by ID. */
  getPoll(pollId: string): Poll | undefined;
}

/** Internal mutable poll representation. */
interface InternalPoll {
  id: string;
  groupId: string;
  question: string;
  options: Array<{ label: string; votes: Set<string> }>;
  createdAt: Date;
  closed: boolean;
}

/** Internal state for the group manager. */
interface GroupManagerState {
  readonly configs: Map<string, GroupConfig>;
  readonly polls: Map<string, InternalPoll>;
}

/** Convert an internal mutable poll to the public readonly Poll. */
function snapshotPoll(internal: InternalPoll): Poll {
  return {
    id: internal.id,
    groupId: internal.groupId,
    question: internal.question,
    options: internal.options.map((o) => ({
      label: o.label,
      votes: new Set(o.votes) as ReadonlySet<string>,
    })),
    createdAt: internal.createdAt,
    closed: internal.closed,
  };
}

/** Decide whether to respond based on group mode. */
function evaluateGroupResponse(
  config: GroupConfig | undefined,
  message: string,
): boolean {
  if (!config) return true;

  switch (config.mode) {
    case "always":
      return true;
    case "mentioned-only":
      return message.includes(`@${config.botName}`);
    case "owner-only":
      return false;
    default:
      return true;
  }
}

/** Check if a command requires owner privilege. */
function authorizeOwnerCommand(
  command: string,
  context: OwnerContext,
): boolean {
  if (!context.isOwner && OWNER_COMMANDS.has(command)) {
    return false;
  }
  return context.isOwner;
}

/** Build and store a new poll from the given options. */
function buildGroupPoll(
  gms: GroupManagerState,
  groupId: string,
  question: string,
  options: readonly string[],
): Poll {
  const id = crypto.randomUUID();
  const internal: InternalPoll = {
    id,
    groupId,
    question,
    options: options.map((label) => ({ label, votes: new Set<string>() })),
    createdAt: new Date(),
    closed: false,
  };
  gms.polls.set(id, internal);
  return snapshotPoll(internal);
}

/** Cast a vote on a poll, enforcing one-vote-per-voter. */
function castPollVote(
  gms: GroupManagerState,
  pollId: string,
  optionIndex: number,
  voterId: string,
): boolean {
  const poll = gms.polls.get(pollId);
  if (!poll || poll.closed) return false;
  if (optionIndex < 0 || optionIndex >= poll.options.length) return false;

  for (const option of poll.options) {
    if (option.votes.has(voterId)) return false;
  }

  poll.options[optionIndex].votes.add(voterId);
  return true;
}

/**
 * Create a new group manager instance.
 *
 * Manages per-group configuration, message filtering based on group mode,
 * and poll lifecycle (create, vote, close).
 */
export function createGroupManager(): GroupManager {
  const gms: GroupManagerState = {
    configs: new Map(),
    polls: new Map(),
  };

  return {
    configure(groupId: string, config: GroupConfig): void {
      gms.configs.set(groupId, config);
    },

    shouldRespond(groupId: string, message: string): boolean {
      return evaluateGroupResponse(gms.configs.get(groupId), message);
    },

    isOwnerCommand(command: string, context: OwnerContext): boolean {
      return authorizeOwnerCommand(command, context);
    },

    createPoll(
      groupId: string,
      question: string,
      options: readonly string[],
    ): Poll {
      return buildGroupPoll(gms, groupId, question, options);
    },

    vote(pollId: string, optionIndex: number, voterId: string): boolean {
      return castPollVote(gms, pollId, optionIndex, voterId);
    },

    closePoll(pollId: string): Poll | undefined {
      const poll = gms.polls.get(pollId);
      if (!poll) return undefined;
      poll.closed = true;
      return snapshotPoll(poll);
    },

    getPoll(pollId: string): Poll | undefined {
      const poll = gms.polls.get(pollId);
      if (!poll) return undefined;
      return snapshotPoll(poll);
    },
  };
}
