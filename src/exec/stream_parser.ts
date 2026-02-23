/**
 * Stream-JSON output parsing for Claude CLI sessions.
 *
 * Parses the newline-delimited JSON messages from Claude's
 * stream-json output format, extracting text content from
 * assistant messages and result messages.
 *
 * @module
 */

/**
 * Stream-JSON message types for Claude CLI I/O.
 * See: https://docs.anthropic.com/en/docs/claude-code/sdk
 */
interface StreamJsonUserMessage {
  readonly type: "user_input";
  readonly content: string;
}

/** A single result message from Claude's stream-json output. */
interface StreamJsonResultMessage {
  readonly type: "result";
  readonly result?: string;
  readonly subtype?: string;
  readonly cost_usd?: number;
  readonly duration_ms?: number;
  readonly duration_api_ms?: number;
  readonly is_error?: boolean;
  readonly num_turns?: number;
  readonly session_id?: string;
}

/** An assistant message from Claude's stream-json output. */
interface StreamJsonAssistantMessage {
  readonly type: "assistant";
  readonly message?: {
    readonly content?: ReadonlyArray<{
      readonly type: string;
      readonly text?: string;
    }>;
  };
}

/** Encode a stream-json user message as UTF-8 bytes. */
export function encodeUserMessage(content: string): Uint8Array {
  const msg: StreamJsonUserMessage = { type: "user_input", content };
  const json = JSON.stringify(msg) + "\n";
  return new TextEncoder().encode(json);
}

/** Extract text content from a single parsed stream-json message. */
function extractTextFromStreamMessage(
  parsed: Record<string, unknown>,
): readonly string[] {
  if (parsed.type === "assistant") {
    const msg = parsed as unknown as StreamJsonAssistantMessage;
    if (!msg.message?.content) return [];
    return msg.message.content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text!);
  }
  if (parsed.type === "result") {
    const msg = parsed as unknown as StreamJsonResultMessage;
    return msg.result ? [msg.result] : [];
  }
  return [];
}

/**
 * Parse accumulated stream-json output into readable text.
 *
 * Extracts text from assistant messages and result messages,
 * joining them with newlines. Non-JSON lines are skipped.
 */
export function parseStreamOutput(raw: string): string {
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const parts: string[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      parts.push(...extractTextFromStreamMessage(parsed));
    } catch {
      // Non-JSON line — skip
    }
  }
  return parts.join("\n");
}
