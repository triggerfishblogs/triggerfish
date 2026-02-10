/**
 * Ripple — real-time presence and typing indicators across channels.
 *
 * Tracks per-channel typing state and agent-level presence (online/away/busy).
 * Provides adapter integration hooks for wiring to channel-specific typing APIs.
 *
 * @module
 */

/** Agent presence state. */
export type AgentState = "idle" | "online" | "away" | "busy" | "processing" | "speaking" | "error";

/** Callback invoked when typing state changes for a channel. */
export type TypingCallback = (channelId: string, typing: boolean) => void;

/** Callback invoked when the global agent state changes. */
export type StateCallback = (state: AgentState) => void;

/** Ripple manager for tracking typing and presence state. */
export interface RippleManager {
  /** Set typing indicator for a channel. */
  setTyping(channelId: string, typing: boolean): void;

  /** Check if typing is active for a channel. */
  isTyping(channelId: string): boolean;

  /** Set the agent's global presence state. */
  setState(state: AgentState): void;

  /** Get the agent's current presence state. */
  getState(): AgentState;

  /** Register a callback for typing state changes on a specific channel. */
  onTyping(channelId: string, callback: TypingCallback): void;

  /** Register a callback for global state changes. */
  onStateChange(callback: StateCallback): void;

  /** Remove a typing callback for a channel. */
  offTyping(channelId: string, callback: TypingCallback): void;

  /** Remove a state change callback. */
  offStateChange(callback: StateCallback): void;
}

/**
 * Create a new ripple manager instance.
 *
 * Manages per-channel typing indicators and global agent presence state.
 * Supports callback registration for wiring to channel adapters.
 */
export function createRippleManager(): RippleManager {
  const typingState = new Map<string, boolean>();
  let agentState: AgentState = "idle";
  const typingCallbacks = new Map<string, Set<TypingCallback>>();
  const stateCallbacks = new Set<StateCallback>();

  return {
    setTyping(channelId: string, typing: boolean): void {
      const prev = typingState.get(channelId) ?? false;
      typingState.set(channelId, typing);

      if (prev !== typing) {
        const callbacks = typingCallbacks.get(channelId);
        if (callbacks) {
          for (const cb of callbacks) {
            cb(channelId, typing);
          }
        }
      }
    },

    isTyping(channelId: string): boolean {
      return typingState.get(channelId) ?? false;
    },

    setState(state: AgentState): void {
      const prev = agentState;
      agentState = state;

      if (prev !== state) {
        for (const cb of stateCallbacks) {
          cb(state);
        }
      }
    },

    getState(): AgentState {
      return agentState;
    },

    onTyping(channelId: string, callback: TypingCallback): void {
      let callbacks = typingCallbacks.get(channelId);
      if (!callbacks) {
        callbacks = new Set();
        typingCallbacks.set(channelId, callbacks);
      }
      callbacks.add(callback);
    },

    onStateChange(callback: StateCallback): void {
      stateCallbacks.add(callback);
    },

    offTyping(channelId: string, callback: TypingCallback): void {
      const callbacks = typingCallbacks.get(channelId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          typingCallbacks.delete(channelId);
        }
      }
    },

    offStateChange(callback: StateCallback): void {
      stateCallbacks.delete(callback);
    },
  };
}
