/**
 * Bumpers — taint escalation guard for owner sessions.
 *
 * When deployed, any tool call that would escalate the session's taint
 * level is blocked before execution. The agent receives a redirect
 * message explaining the constraint. Bumpers are ON by default.
 *
 * @module
 */

import type { ClassificationLevel } from "../types/classification.ts";
import { CLASSIFICATION_ORDER } from "../types/classification.ts";
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
 * Check if bumpers would block a taint escalation.
 *
 * Returns true when bumpers are enabled AND the incoming classification
 * level is strictly higher than the current session taint.
 */
export function wouldBumpersBlock(
  session: SessionState,
  incomingLevel: ClassificationLevel,
): boolean {
  if (!session.bumpersEnabled) return false;
  return CLASSIFICATION_ORDER[incomingLevel] >
    CLASSIFICATION_ORDER[session.taint];
}

/**
 * Toggle bumpers on/off, returning a new immutable session object.
 */
export function toggleBumpers(session: SessionState): SessionState {
  return { ...session, bumpersEnabled: !session.bumpersEnabled };
}
