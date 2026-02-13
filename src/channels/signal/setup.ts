/**
 * Signal channel guided setup.
 *
 * Walks the user through signal-cli installation verification,
 * device linking with QR code display, and daemon startup.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";

/** Result of the guided Signal setup flow. */
export interface SignalSetupResult {
  readonly account: string;
  readonly endpoint: string;
}

/**
 * Check if signal-cli is installed and available on PATH.
 *
 * @returns The path to signal-cli, or an error message.
 */
export async function checkSignalCli(): Promise<Result<string, string>> {
  try {
    const cmd = new Deno.Command("signal-cli", { args: ["--version"], stdout: "piped", stderr: "piped" });
    const output = await cmd.output();
    if (output.success) {
      const version = new TextDecoder().decode(output.stdout).trim();
      return { ok: true, value: version };
    }
    return { ok: false, error: "signal-cli returned non-zero exit code" };
  } catch {
    return { ok: false, error: "signal-cli not found on PATH. Install it from https://github.com/AsamK/signal-cli" };
  }
}

/**
 * Run `signal-cli link` and capture the sgnl:// URI.
 *
 * Spawns signal-cli link in the background, reads the URI from stdout,
 * then waits for the user to scan the QR code. Returns when linking completes.
 *
 * @param account - Phone number (E.164) to link with.
 * @param deviceName - Name for this linked device.
 * @returns The link URI for QR code display.
 */
export async function startLinkProcess(
  account: string,
  deviceName: string,
): Promise<Result<{ uri: string; process: Deno.ChildProcess }, string>> {
  try {
    const cmd = new Deno.Command("signal-cli", {
      args: ["link", "-n", deviceName],
      stdout: "piped",
      stderr: "piped",
    });
    const child = cmd.spawn();

    // Read the URI from stdout — it's the first line signal-cli outputs
    const reader = child.stdout.getReader();
    const decoder = new TextDecoder();
    let uri = "";

    // Read chunks until we get a complete URI line
    const timeout = AbortSignal.timeout(30000);
    while (!timeout.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      uri += decoder.decode(value);
      if (uri.includes("\n")) {
        uri = uri.split("\n")[0].trim();
        break;
      }
    }

    reader.releaseLock();

    if (!uri.startsWith("sgnl://") && !uri.startsWith("https://signal.link/")) {
      // Try stderr for error info
      const stderrReader = child.stderr.getReader();
      const { value: errBytes } = await stderrReader.read();
      stderrReader.releaseLock();
      const errMsg = errBytes ? decoder.decode(errBytes).trim() : "Unknown error";
      return { ok: false, error: `signal-cli link did not produce a URI. Got: "${uri}". stderr: ${errMsg}` };
    }

    return { ok: true, value: { uri, process: child } };
  } catch (err) {
    return { ok: false, error: `Failed to start signal-cli link: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Render a URI as a QR code in the terminal using Unicode block characters.
 *
 * Uses the `qrcode` npm package if available, falling back to printing
 * the raw URI for the user to convert manually.
 *
 * @param uri - The sgnl:// URI to encode.
 */
export async function renderQrCode(uri: string): Promise<void> {
  try {
    // Try using qrcode npm package for terminal rendering
    const qrcode = await import("npm:qrcode@1.5.4");
    const qrText = await qrcode.toString(uri, {
      type: "terminal",
      small: true,
      errorCorrectionLevel: "L",
    });
    console.log("\n" + qrText);
  } catch {
    // Fallback: try qrencode CLI tool
    try {
      const cmd = new Deno.Command("qrencode", {
        args: ["-t", "UTF8", "-o", "-", uri],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await cmd.output();
      if (output.success) {
        console.log("\n" + new TextDecoder().decode(output.stdout));
        return;
      }
    } catch {
      // qrencode not available either
    }

    // Final fallback: print the URI directly
    console.log("\nCould not render QR code. Open this URI in a QR code generator:");
    console.log(`\n  ${uri}\n`);
    console.log("Or visit: https://api.qrserver.com/v1/create-qr-code/?data=" + encodeURIComponent(uri));
  }
}

/**
 * Check if signal-cli daemon is already running on the given endpoint.
 *
 * @param host - TCP hostname.
 * @param port - TCP port.
 * @returns true if a connection can be established.
 */
export async function isDaemonRunning(host: string, port: number): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: host, port });
    conn.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Start signal-cli daemon on a TCP socket.
 *
 * @param account - Phone number (E.164) to run daemon for.
 * @param host - TCP hostname to bind. Default: localhost.
 * @param port - TCP port to bind. Default: 7583.
 * @returns The child process handle.
 */
export function startDaemon(
  account: string,
  host: string = "localhost",
  port: number = 7583,
): Result<Deno.ChildProcess, string> {
  try {
    const cmd = new Deno.Command("signal-cli", {
      args: ["-a", account, "daemon", "--tcp", `${host}:${port}`],
      stdout: "piped",
      stderr: "piped",
    });
    const child = cmd.spawn();
    return { ok: true, value: child };
  } catch (err) {
    return { ok: false, error: `Failed to start signal-cli daemon: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Wait for daemon to become reachable on TCP.
 *
 * @param host - TCP hostname.
 * @param port - TCP port.
 * @param timeoutMs - Max wait time. Default: 15000.
 * @returns true when reachable, false on timeout.
 */
export async function waitForDaemon(host: string, port: number, timeoutMs: number = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDaemonRunning(host, port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
