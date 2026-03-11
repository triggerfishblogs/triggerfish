/**
 * Defines the Transport interface and stdio/SSE implementations for communicating with MCP servers.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("mcp");

/**
 * Validates a URL before a network connection is established.
 *
 * Implementations should check the URL against an SSRF denylist via DNS
 * resolution. Inject `resolveAndCheck` from `src/tools/web/ssrf.ts` at
 * the gateway wiring layer — mcp/ cannot import from tools/ directly
 * (dependency layer constraint).
 *
 * Returns Ok(void) if the URL is safe, Err(reason) if it should be blocked.
 */
export type UrlValidator = (url: string) => Promise<Result<void, string>>;

/** Transport interface for MCP client-server communication. */
export interface Transport {
  /** Establish connection to the MCP server. */
  connect(): Promise<void>;
  /** Disconnect from the MCP server. */
  disconnect(): Promise<void>;
  /** Send a JSON-RPC message string to the server. */
  send(msg: string): Promise<void>;
  /** Register a handler for incoming messages from the server. */
  onMessage(handler: (msg: string) => void): void;
}

/**
 * StdioTransport spawns a subprocess and communicates via stdin/stdout.
 *
 * The MCP server is started as a child process. Requests are written to
 * its stdin and responses are read from its stdout, one JSON message per line.
 */
export class StdioTransport implements Transport {
  readonly #command: string;
  readonly #args: readonly string[];
  readonly #env?: Readonly<Record<string, string>>;
  #process: Deno.ChildProcess | null = null;
  readonly #handlers: Array<(msg: string) => void> = [];

  constructor(
    command: string,
    args: readonly string[] = [],
    env?: Readonly<Record<string, string>>,
  ) {
    this.#command = command;
    this.#args = args;
    this.#env = env;
  }

  // deno-lint-ignore require-await
  async connect(): Promise<void> {
    const cmd = new Deno.Command(this.#command, {
      args: [...this.#args],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
      env: { PATH: Deno.env.get("PATH") ?? "", ...this.#env },
    });
    this.#process = cmd.spawn();

    // Read stdout line by line and dispatch to handlers
    const reader = this.#process.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const readLoop = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 0) {
              for (const handler of this.#handlers) {
                handler(trimmed);
              }
            }
          }
        }
      } catch (err) {
        log.debug("MCP stdio read loop terminated", {
          command: this.#command,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    readLoop();
  }

  // deno-lint-ignore require-await
  async disconnect(): Promise<void> {
    if (this.#process) {
      try {
        this.#process.stdin.getWriter().close();
      } catch (err) {
        log.debug("MCP stdio stdin already closed on disconnect", {
          command: this.#command,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      this.#process.kill();
      this.#process = null;
    }
  }

  async send(msg: string): Promise<void> {
    if (!this.#process) {
      throw new Error("Transport not connected");
    }
    const writer = this.#process.stdin.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(msg + "\n"));
    writer.releaseLock();
  }

  onMessage(handler: (msg: string) => void): void {
    this.#handlers.push(handler);
  }
}

/**
 * SSETransport connects to an MCP server via HTTP Server-Sent Events.
 *
 * Requests are sent via HTTP POST and responses arrive as SSE events.
 *
 * Pass a `urlValidator` (e.g. wrapping `resolveAndCheck` from tools/web/ssrf.ts)
 * to enforce SSRF prevention before the connection is established. Without a
 * validator, no DNS-based IP check is performed — always inject one in production.
 */
export class SSETransport implements Transport {
  readonly #url: string;
  readonly #urlValidator: UrlValidator | null;
  #eventSource: EventSource | null = null;
  readonly #handlers: Array<(msg: string) => void> = [];

  constructor(url: string, urlValidator?: UrlValidator) {
    this.#url = url;
    this.#urlValidator = urlValidator ?? null;
  }

  async connect(): Promise<void> {
    if (this.#urlValidator) {
      const result = await this.#urlValidator(this.#url);
      if (!result.ok) {
        log.warn("MCP SSE connection blocked by SSRF policy", {
          url: this.#url,
          reason: result.error,
        });
        throw new Error(
          `SSE connection blocked by SSRF policy: ${result.error}`,
        );
      }
      log.debug("MCP SSE SSRF check passed", { url: this.#url });
    } else {
      log.debug("MCP SSE connecting without SSRF validation", {
        url: this.#url,
      });
    }
    // SSE connection for receiving messages
    this.#eventSource = new EventSource(this.#url);
    this.#eventSource.onmessage = (event: MessageEvent) => {
      for (const handler of this.#handlers) {
        handler(event.data);
      }
    };
  }

  // deno-lint-ignore require-await
  async disconnect(): Promise<void> {
    if (this.#eventSource) {
      this.#eventSource.close();
      this.#eventSource = null;
    }
  }

  async send(msg: string): Promise<void> {
    // URL was already validated in connect(); no re-check needed since
    // #url is readonly and the same value is used for both SSE and POST.
    await fetch(this.#url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: msg,
    });
  }

  onMessage(handler: (msg: string) => void): void {
    this.#handlers.push(handler);
  }
}
