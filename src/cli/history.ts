/**
 * Persistent input history for the CLI chat interface.
 *
 * Provides immutable history navigation (up/down), consecutive
 * deduplication, max entry limits, and JSON persistence.
 *
 * @module
 */

/** Default maximum number of history entries. */
const DEFAULT_MAX_ENTRIES = 1000;

/** Immutable input history with navigation state. */
export interface InputHistory {
  /** All stored entries (oldest first). */
  readonly entries: readonly string[];
  /** Current navigation index (-1 means "not navigating", i.e., fresh input). */
  readonly index: number;

  /** Add an entry. Deduplicates against the most recent. Returns new history. */
  push(entry: string): InputHistory;
  /** Navigate up (older). Returns new history with updated index. */
  up(): InputHistory;
  /** Navigate down (newer). Returns new history with updated index. */
  down(): InputHistory;
  /** Get the entry at current index, or null if at bottom (fresh input). */
  current(): string | null;
  /** Reset navigation index to -1. Returns new history. */
  resetNavigation(): InputHistory;
}

/**
 * Create a new input history.
 *
 * @param maxEntries - Maximum entries to keep (default: 1000)
 * @param entries - Optional initial entries
 * @returns An immutable InputHistory instance
 */
export function createInputHistory(
  maxEntries: number = DEFAULT_MAX_ENTRIES,
  entries: readonly string[] = [],
): InputHistory {
  return makeHistory(entries, -1, maxEntries);
}

/** Internal factory for immutable history instances. */
function makeHistory(
  entries: readonly string[],
  index: number,
  maxEntries: number,
): InputHistory {
  return {
    entries,
    index,

    push(entry: string): InputHistory {
      // Skip empty/whitespace-only entries
      if (entry.trim().length === 0) return this;

      // Deduplicate consecutive
      if (entries.length > 0 && entries[entries.length - 1] === entry) {
        return makeHistory(entries, -1, maxEntries);
      }

      const newEntries = [...entries, entry];
      // Trim to max
      const trimmed = newEntries.length > maxEntries
        ? newEntries.slice(newEntries.length - maxEntries)
        : newEntries;

      return makeHistory(trimmed, -1, maxEntries);
    },

    up(): InputHistory {
      if (entries.length === 0) return this;

      if (index === -1) {
        // Start navigating from the newest entry
        return makeHistory(entries, entries.length - 1, maxEntries);
      }

      if (index > 0) {
        return makeHistory(entries, index - 1, maxEntries);
      }

      // Already at the oldest entry
      return this;
    },

    down(): InputHistory {
      if (index === -1) return this;

      if (index < entries.length - 1) {
        return makeHistory(entries, index + 1, maxEntries);
      }

      // At the newest — go back to fresh input
      return makeHistory(entries, -1, maxEntries);
    },

    current(): string | null {
      if (index === -1 || index >= entries.length) return null;
      return entries[index];
    },

    resetNavigation(): InputHistory {
      if (index === -1) return this;
      return makeHistory(entries, -1, maxEntries);
    },
  };
}

/**
 * Load input history from a JSON file.
 *
 * Returns an empty history if the file doesn't exist or is corrupt.
 *
 * @param filePath - Path to the history JSON file
 * @param maxEntries - Maximum entries to keep
 * @returns An InputHistory instance
 */
export async function loadInputHistory(
  filePath: string,
  maxEntries: number = DEFAULT_MAX_ENTRIES,
): Promise<InputHistory> {
  try {
    const raw = await Deno.readTextFile(filePath);
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.every((e) => typeof e === "string")) {
      const trimmed = parsed.length > maxEntries
        ? parsed.slice(parsed.length - maxEntries)
        : parsed;
      return makeHistory(trimmed, -1, maxEntries);
    }

    return createInputHistory(maxEntries);
  } catch {
    return createInputHistory(maxEntries);
  }
}

/**
 * Save input history to a JSON file.
 *
 * @param filePath - Path to the history JSON file
 * @param history - The history to save
 */
export async function saveInputHistory(
  filePath: string,
  history: InputHistory,
): Promise<void> {
  await Deno.writeTextFile(filePath, JSON.stringify(history.entries));
}
