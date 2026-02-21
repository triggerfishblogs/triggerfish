/**
 * Simple line-buffered REPL for non-TTY environments (piped input).
 *
 * Connects to the daemon via WebSocket. Falls back to stdin.read()
 * for compatibility with piped input.
 * @module
 */

import type { TriggerFishConfig } from "../../core/config.ts";
import {
  printBanner,
  renderError,
  renderPrompt,
} from "../../cli/chat/chat_ui.ts";
import type { ChatEvent } from "../../core/types/chat_event.ts";

/**
 * Simple line-buffered REPL for non-TTY environments (piped input).
 *
 * Reads stdin line-by-line, sends each to the daemon via WebSocket,
 * and waits for the response before prompting again.
 */
export async function runSimpleWsRepl(
  ws: WebSocket,
  providerName: string,
  config: TriggerFishConfig,
): Promise<void> {
  const decoder = new TextDecoder();
  const buf = new Uint8Array(8192);
  let partial = "";

  renderPrompt();

  while (true) {
    const n = await Deno.stdin.read(buf);
    if (n === null) break;

    partial += decoder.decode(buf.subarray(0, n));

    let newlineIdx: number;
    while ((newlineIdx = partial.indexOf("\n")) !== -1) {
      const line = partial.slice(0, newlineIdx).trimEnd();
      partial = partial.slice(newlineIdx + 1);

      if (line === "/quit" || line === "/exit" || line === "/q") {
        console.log("\n  Goodbye.\n");
        ws.close();
        return;
      }

      if (line === "/clear") {
        ws.send(JSON.stringify({ type: "clear" }));
        console.log("\x1b[2J\x1b[H");
        printBanner(providerName, config.models.primary.model, "");
        renderPrompt();
        continue;
      }

      if (line === "/compact") {
        console.log("  Compacting conversation history...");
        ws.send(JSON.stringify({ type: "compact" }));
        // compact_start/compact_complete handled by the main event handler
        renderPrompt();
        continue;
      }

      if (line.length === 0) {
        renderPrompt();
        continue;
      }

      // Send to daemon and wait for response
      console.log();
      const responsePromise = Promise.withResolvers<void>();

      const handler = async (event: MessageEvent) => {
        try {
          const data = typeof event.data === "string"
            ? event.data
            : new TextDecoder().decode(event.data as ArrayBuffer);
          const evt = JSON.parse(data) as ChatEvent;

          // Handle secret prompt in non-TTY mode: read a line from stdin
          if (evt.type === "secret_prompt") {
            const hintStr = evt.hint ? ` (${evt.hint})` : "";
            const enc = new TextEncoder();
            Deno.stderr.writeSync(enc.encode(`  Enter value for '${evt.name}'${hintStr}: `));
            const lineBuf = new Uint8Array(4096);
            const nRead = await Deno.stdin.read(lineBuf);
            const value = nRead !== null
              ? new TextDecoder().decode(lineBuf.subarray(0, nRead)).trimEnd()
              : null;
            try {
              ws.send(JSON.stringify({
                type: "secret_prompt_response",
                nonce: evt.nonce,
                value: value && value.length > 0 ? value : null,
              }));
            } catch { /* ignore */ }
            return;
          }

          if (evt.type === "response" || evt.type === "error") {
            if (evt.type === "error") {
              renderError(evt.message);
            }
            ws.removeEventListener("message", handler);
            responsePromise.resolve();
          }
        } catch {
          // ignore
        }
      };

      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ type: "message", content: line }));
      await responsePromise.promise;

      renderPrompt();
    }
  }
  ws.close();
}
