/**
 * Ripple — real-time presence and typing indicators across channels.
 *
 * Tracks per-channel typing state and agent-level presence (online/away/busy).
 *
 * @module
 */

/** Agent presence state. */
export type AgentState = "idle" | "online" | "away" | "busy" | "processing" | "speaking" | "error";

/** Ripple manager for tracking typing and presence state. */
export interface RippleManager {
  /** Set typing indicator for a channel. */
  setTyping(channelId: string, typing: boolean): void;

  /** Check if typing is active for a channel. */
  isTyping(channelId: string): boolean;

  /** Set the agent's global presence state. */
  setState(state: string): void;

  /** Get the agent's current presence state. */
  getState(): string;
}

/**
 * Create a new ripple manager instance.
 *
 * Manages per-channel typing indicators and global agent presence state.
 */
export function createRippleManager(): RippleManager {
  const typingState = new Map<string, boolean>();
  let agentState = "idle";

  return {
    setTyping(channelId: string, typing: boolean): void {
      typingState.set(channelId, typing);
    },

    isTyping(channelId: string): boolean {
      return typingState.get(channelId) ?? false;
    },

    setState(state: string): void {
      agentState = state;
    },

    getState(): string {
      return agentState;
    },
  };
}
