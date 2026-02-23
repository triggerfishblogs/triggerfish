/**
 * Tab-completion suggestion engine for terminal input.
 *
 * Checks slash commands first, then input history (most recent match wins).
 *
 * @module
 */

// ─── Constants ──────────────────────────────────────────────────

/** Slash commands available for tab-completion. */
const SLASH_COMMANDS: readonly string[] = [
  "/clear",
  "/compact",
  "/exit",
  "/help",
  "/quit",
  "/verbose",
];

// ─── Types ──────────────────────────────────────────────────────

/** Suggestion engine interface. */
export interface SuggestionEngine {
  /** Get the best suggestion for the given input prefix. */
  suggest(input: string, history: readonly string[]): string | null;
}

// ─── Internal helpers ───────────────────────────────────────────

/** Find a slash command matching the given prefix. */
function matchSlashCommand(input: string): string | null {
  for (const cmd of SLASH_COMMANDS) {
    if (cmd.startsWith(input) && cmd !== input) {
      return cmd;
    }
  }
  return null;
}

/** Find the most recent history entry matching the given prefix. */
function matchHistoryEntry(
  input: string,
  history: readonly string[],
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].startsWith(input) && history[i] !== input) {
      return history[i];
    }
  }
  return null;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Create a suggestion engine for tab-completion.
 *
 * Checks slash commands first, then history (most recent match wins).
 *
 * @returns A SuggestionEngine instance
 */
export function createSuggestionEngine(): SuggestionEngine {
  return {
    suggest(input: string, history: readonly string[]): string | null {
      if (input.length === 0) return null;

      if (input.startsWith("/")) {
        const cmd = matchSlashCommand(input);
        if (cmd) return cmd;
      }

      return matchHistoryEntry(input, history);
    },
  };
}
