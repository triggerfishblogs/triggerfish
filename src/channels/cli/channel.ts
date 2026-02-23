/**
 * CLI channel adapter for interactive terminal sessions.
 *
 * The CLI channel is the simplest channel adapter: the terminal user
 * is always the owner, classification defaults to INTERNAL, and
 * messages are formatted to stdout via a configurable output callback.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "../types.ts";

/** Configuration options for the CLI channel. */
export interface CliChannelConfig {
  /** Whether to run in interactive REPL mode. */
  readonly interactive: boolean;
  /** Output callback for formatted messages. Defaults to console.log. */
  readonly output?: (message: string) => void;
  /** Whether to display session taint level in output. */
  readonly showTaint?: boolean;
}

/** CLI channel adapter with input simulation support. */
export interface CliChannel extends ChannelAdapter {
  /** Simulate terminal input for testing. */
  simulateInput(text: string): void;
}

/** Format a channel message with optional taint prefix. */
function formatCliOutput(
  message: ChannelMessage,
  showTaint: boolean,
): string {
  if (showTaint && message.sessionTaint) {
    return `[${message.sessionTaint}] ${message.content}`;
  }
  return message.content;
}

/**
 * Create a CLI channel adapter.
 *
 * The CLI user is always the owner. Channel classification defaults
 * to INTERNAL. Messages are formatted and sent to the output callback.
 */
export function createCliChannel(config: CliChannelConfig): CliChannel {
  const outputFn = config.output ?? console.log;
  const showTaint = config.showTaint ?? false;
  let connected = false;
  let handler: MessageHandler | null = null;

  return {
    classification: "INTERNAL" as ClassificationLevel,
    isOwner: true,
    // deno-lint-ignore require-await
    async connect(): Promise<void> {
      connected = true;
    },
    // deno-lint-ignore require-await
    async disconnect(): Promise<void> {
      connected = false;
    },
    // deno-lint-ignore require-await
    async send(message: ChannelMessage): Promise<void> {
      outputFn(formatCliOutput(message, showTaint));
    },
    onMessage(msgHandler: MessageHandler): void {
      handler = msgHandler;
    },
    status(): ChannelStatus {
      return { connected, channelType: "cli" };
    },
    simulateInput(text: string): void {
      if (handler) handler({ content: text });
    },
  };
}
