/**
 * MCP Transport Layer
 *
 * Defines the Transport interface and implementations for communicating
 * with MCP servers via different transport mechanisms.
 */

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
  #process: Deno.ChildProcess | null = null;
  readonly #handlers: Array<(msg: string) => void> = [];

  constructor(command: string, args: readonly string[] = []) {
    this.#command = command;
    this.#args = args;
  }

  async connect(): Promise<void> {
    const cmd = new Deno.Command(this.#command, {
      args: [...this.#args],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
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
      } catch {
        // Process closed, stop reading
      }
    };

    readLoop();
  }

  async disconnect(): Promise<void> {
    if (this.#process) {
      try {
        this.#process.stdin.getWriter().close();
      } catch {
        // Already closed
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
 */
export class SSETransport implements Transport {
  readonly #url: string;
  #eventSource: EventSource | null = null;
  readonly #handlers: Array<(msg: string) => void> = [];

  constructor(url: string) {
    this.#url = url;
  }

  async connect(): Promise<void> {
    // SSE connection for receiving messages
    this.#eventSource = new EventSource(this.#url);
    this.#eventSource.onmessage = (event: MessageEvent) => {
      for (const handler of this.#handlers) {
        handler(event.data);
      }
    };
  }

  async disconnect(): Promise<void> {
    if (this.#eventSource) {
      this.#eventSource.close();
      this.#eventSource = null;
    }
  }

  async send(msg: string): Promise<void> {
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
