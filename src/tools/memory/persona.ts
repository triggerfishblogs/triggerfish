/**
 * Persona context loader — deterministic auto-recall of user identity,
 * preferences, rules, and project conventions from memory.
 *
 * Called on every LLM turn via the dynamic system prompt getter.
 * Queries the memory store for tagged records and formats them into
 * a prompt section the LLM sees automatically — no tool call needed.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { MemoryStore } from "./store.ts";
import type { MemoryRecord } from "./types.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("persona");

/** Tags queried for persona context, in display order. */
const PERSONA_TAGS = ["persona", "rule", "preference", "project"] as const;

/** Section headings per tag. */
const TAG_HEADINGS: Record<string, string> = {
  persona: "About You",
  rule: "Your Rules",
  preference: "Your Preferences",
  project: "Project Context",
};

/**
 * Maximum characters for the assembled persona prompt section.
 * Records are added in priority order (rules first) until the budget
 * is exhausted. Keeps the persona from bloating the context window.
 */
export const MAX_PERSONA_CHARS = 4_000;

/** Options for loading persona context. */
export interface PersonaContextOptions {
  readonly store: MemoryStore;
  readonly agentId: string;
  readonly sessionTaint: ClassificationLevel;
  readonly maxChars?: number;
}

/** Format a single memory record as a bullet point. */
function formatRecord(record: MemoryRecord): string {
  return `- ${record.content}`;
}

/**
 * Load persona context from memory and format as a system prompt section.
 *
 * Returns an empty string when no persona memories exist.
 * Enforces a character budget — records are added in tag priority order
 * (rules > preferences > persona > project) until the cap is reached.
 */
export async function loadPersonaContext(
  options: PersonaContextOptions,
): Promise<string> {
  const { store, agentId, sessionTaint } = options;
  const maxChars = options.maxChars ?? MAX_PERSONA_CHARS;

  // Query all four tags in parallel
  const tagResults = await Promise.all(
    PERSONA_TAGS.map(async (tag) => {
      try {
        const records = await store.list({ agentId, sessionTaint, tag });
        return { tag, records };
      } catch (err) {
        log.error("Persona memory query failed", {
          operation: "loadPersonaContext",
          tag,
          err,
        });
        return { tag, records: [] as readonly MemoryRecord[] };
      }
    }),
  );

  // Priority order: rules first (prevent mistakes), then preferences,
  // then persona facts, then project context
  const priorityOrder = ["rule", "preference", "persona", "project"];
  const sorted = [...tagResults].sort(
    (a, b) => priorityOrder.indexOf(a.tag) - priorityOrder.indexOf(b.tag),
  );

  const sections: string[] = [];
  let totalChars = 0;
  const headerBase = "## What I Know About You\n\n";
  totalChars += headerBase.length;

  for (const { tag, records } of sorted) {
    if (records.length === 0) continue;

    const heading = `### ${TAG_HEADINGS[tag]}\n`;
    if (totalChars + heading.length >= maxChars) break;

    const lines: string[] = [heading];
    totalChars += heading.length;

    for (const record of records) {
      const line = formatRecord(record) + "\n";
      if (totalChars + line.length >= maxChars) break;
      lines.push(line);
      totalChars += line.length;
    }

    // Only add the section if we got at least one record line
    if (lines.length > 1) {
      sections.push(lines.join(""));
    }
  }

  if (sections.length === 0) return "";

  log.debug("Persona context loaded", {
    operation: "loadPersonaContext",
    sectionCount: sections.length,
    totalChars,
  });

  return headerBase + sections.join("\n");
}
