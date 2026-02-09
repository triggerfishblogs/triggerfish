/**
 * Group chat management for Triggerfish channels.
 *
 * Handles group chat modes (always, mentioned-only, owner-only),
 * per-group configuration, and owner-only command restrictions.
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

/** Owner-only commands that require elevated privileges. */
const OWNER_COMMANDS: ReadonlySet<string> = new Set([
  "/reset",
  "/model",
  "/config",
  "/skill",
  "/cron",
  "/status",
]);

/** Group chat manager. */
export interface GroupManager {
  /** Configure a group's response mode and bot name. */
  configure(groupId: string, config: GroupConfig): void;

  /** Determine whether the agent should respond to a message in a group. */
  shouldRespond(groupId: string, message: string): boolean;

  /** Check if a command is owner-only and the sender is authorized. */
  isOwnerCommand(command: string, context: OwnerContext): boolean;
}

/**
 * Create a new group manager instance.
 *
 * Manages per-group configuration and message filtering based on group mode.
 */
export function createGroupManager(): GroupManager {
  const configs = new Map<string, GroupConfig>();

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
  };
}
