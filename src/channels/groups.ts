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
  createPoll(groupId: string, question: string, options: readonly string[]): Poll;

  /** Cast a vote on a poll. Each voter can only vote once per poll. */
  vote(pollId: string, optionIndex: number, voterId: string): boolean;

  /** Close a poll and return final results. */
  closePoll(pollId: string): Poll | undefined;

  /** Get a poll by ID. */
  getPoll(pollId: string): Poll | undefined;
}

/**
 * Create a new group manager instance.
 *
 * Manages per-group configuration, message filtering based on group mode,
 * and poll lifecycle (create, vote, close).
 */
export function createGroupManager(): GroupManager {
  const configs = new Map<string, GroupConfig>();
  const polls = new Map<string, {
    id: string;
    groupId: string;
    question: string;
    options: Array<{ label: string; votes: Set<string> }>;
    createdAt: Date;
    closed: boolean;
  }>();

  function toPoll(internal: {
    id: string;
    groupId: string;
    question: string;
    options: Array<{ label: string; votes: Set<string> }>;
    createdAt: Date;
    closed: boolean;
  }): Poll {
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

  return {
    configure(groupId: string, config: GroupConfig): void {
      configs.set(groupId, config);
    },

    shouldRespond(groupId: string, message: string): boolean {
      const config = configs.get(groupId);
      if (!config) {
        return true;
      }

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
    },

    isOwnerCommand(command: string, context: OwnerContext): boolean {
      if (!context.isOwner && OWNER_COMMANDS.has(command)) {
        return false;
      }
      return context.isOwner;
    },

    createPoll(
      groupId: string,
      question: string,
      options: readonly string[],
    ): Poll {
      const id = crypto.randomUUID();
      const internal = {
        id,
        groupId,
        question,
        options: options.map((label) => ({ label, votes: new Set<string>() })),
        createdAt: new Date(),
        closed: false,
      };
      polls.set(id, internal);
      return toPoll(internal);
    },

    vote(pollId: string, optionIndex: number, voterId: string): boolean {
      const poll = polls.get(pollId);
      if (!poll || poll.closed) return false;
      if (optionIndex < 0 || optionIndex >= poll.options.length) return false;

      // Check if voter already voted on any option
      for (const option of poll.options) {
        if (option.votes.has(voterId)) return false;
      }

      poll.options[optionIndex].votes.add(voterId);
      return true;
    },

    closePoll(pollId: string): Poll | undefined {
      const poll = polls.get(pollId);
      if (!poll) return undefined;
      poll.closed = true;
      return toPoll(poll);
    },

    getPoll(pollId: string): Poll | undefined {
      const poll = polls.get(pollId);
      if (!poll) return undefined;
      return toPoll(poll);
    },
  };
}
