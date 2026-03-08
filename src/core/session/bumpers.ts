/**
 * Bumpers — owner session taint escalation guard.
 *
 * Bumpers prevent automatic taint escalation in owner sessions. When
 * deployed, any tool call that would escalate the session's taint level
 * is blocked before execution. The agent receives a redirect message.
 *
 * @module
 */

import type { ClassificationLevel } from "../types/classification.ts";
import { compareClassification } from "../types/classification.ts";
import type { SessionState } from "../types/session.ts";

/** Message returned to the agent when bumpers block a taint escalation. */
export const BUMPER_BLOCK_MESSAGE =
  "[Bumpers] The user has asked you to stay within the current workspace.\n" +
  "This action would escalate the session beyond its current level.\n" +
  "Please find another way to help, or let the user know they can\n" +
  "run /bumpers to give you access to higher-level resources.";

/** System prompt section injected when bumpers are deployed. */
export const BUMPERS_SYSTEM_PROMPT =
  "Bumpers are deployed. You cannot access resources that would escalate\n" +
  "this session beyond its current classification level. If a task requires\n" +
  "higher-level access, let the user know they can run /bumpers to give\n" +
  "you that access. Do not repeatedly ask -- mention it once and move on.";

/**
 * Check if bumpers would block an escalation to the given level.
 *
 * Returns `true` when bumpers are enabled AND the incoming level
 * is strictly higher than the session's current taint.
 */
export function wouldBumpersBlock(
  session: SessionState,
  incomingLevel: ClassificationLevel,
): boolean {
  if (!session.bumpersEnabled) return false;
  return compareClassification(incomingLevel, session.taint) > 0;
}

/**
 * Toggle bumpers on/off, returning a new session state.
 *
 * The original session is not mutated.
 */
export function toggleBumpers(session: SessionState): SessionState {
  return { ...session, bumpersEnabled: !session.bumpersEnabled };
}
