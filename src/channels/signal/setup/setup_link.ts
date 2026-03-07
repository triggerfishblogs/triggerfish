/**
 * Signal device linking and QR code rendering.
 * @module
 */

import { createLogger } from "../../../core/logger/logger.ts";
import type { Result } from "../../../core/types/classification.ts";

const log = createLogger("signal");

/** Consume a ReadableStream to completion, discarding data. Logs total bytes drained. */
function drainStream(stream: ReadableStream<Uint8Array>, label: string): void {
  const reader = stream.getReader();
  let total = 0;
  const pump = (): void => {
    reader.read().then(({ done, value }) => {
      if (value) total += value.byteLength;
      if (done) {
        log.info("Pipe drain complete", { pipe: label, bytesRead: total });
        reader.releaseLock();
        return;
      }
      pump();
    }).catch((err: unknown) => {
      log.debug("Pipe drain ended", { operation: "drainStream", pipe: label, err });
      reader.releaseLock();
    });
  };
  pump();
}

/**
 * Run `signal-cli link` and capture the sgnl:// URI.
 *
 * @param deviceName - Name for this linked device.
 * @param signalCliPath - Path to signal-cli binary.
 * @param javaHome - Optional JAVA_HOME for managed JRE.
 * @returns The link URI for QR code display.
 */
export async function startLinkProcess(
  deviceName: string,
  signalCliPath: string = "signal-cli",
  javaHome?: string,
): Promise<Result<{ uri: string; process: Deno.ChildProcess }, string>> {
  try {
    const env = javaHome
      ? { ...Deno.env.toObject(), JAVA_HOME: javaHome }
      : undefined;
    const cmd = new Deno.Command(signalCliPath, {
      args: ["link", "-n", deviceName],
      stdout: "piped",
      stderr: "piped",
      env,
    });
    const child = cmd.spawn();

    // signal-cli ≥0.14 prints a QR code to stdout BEFORE the URI when
    // System.console() is non-null (always true on Windows PowerShell).
    // Scan all lines for the sgnl:// or https://signal.link/ URI instead
    // of assuming it is the first line.
    const reader = child.stdout.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let uri = "";
    let totalStdout = "";

    const timeout = AbortSignal.timeout(30000);
    while (!timeout.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      buf += chunk;
      totalStdout += chunk;

      // Check every complete line for the link URI
      while (buf.includes("\n")) {
        const newlineIdx = buf.indexOf("\n");
        const line = buf.slice(0, newlineIdx).trim();
        buf = buf.slice(newlineIdx + 1);

        if (
          line.startsWith("sgnl://") ||
          line.startsWith("https://signal.link/")
        ) {
          uri = line;
          break;
        }
      }
      if (uri) break;
    }

    reader.releaseLock();

    // Log raw stdout for diagnostics — critical for debugging Windows failures
    log.info("signal-cli link stdout captured", {
      operation: "startLinkProcess",
      stdoutBytes: totalStdout.length,
      foundUri: !!uri,
      stdoutPreview: totalStdout.slice(0, 500),
    });

    if (!uri) {
      const stderrReader = child.stderr.getReader();
      const { value: errBytes } = await stderrReader.read();
      stderrReader.releaseLock();
      const stderrText = errBytes
        ? decoder.decode(errBytes).trim()
        : "(empty)";
      log.error("signal-cli link did not produce a URI", {
        operation: "startLinkProcess",
        stderr: stderrText,
        stdout: totalStdout.slice(0, 500),
      });
      return {
        ok: false,
        error:
          `signal-cli link did not produce a URI. stderr: ${stderrText}`,
      };
    }

    // Drain stdout and stderr in the background to prevent pipe buffer
    // deadlock. On Windows, pipe buffers are small (4 KB default) and
    // signal-cli writes progress/confirmation after the URI line. If
    // nobody reads, the process blocks and linking fails.
    drainStream(child.stdout, "link.stdout");
    drainStream(child.stderr, "link.stderr");

    return { ok: true, value: { uri, process: child } };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to start signal-cli link: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/** Attempt to render a QR code using the qrcode npm library. */
async function renderQrCodeViaLibrary(uri: string): Promise<boolean> {
  try {
    const qrcode = await import("qrcode");
    const qrText = await qrcode.toString(uri, {
      type: "terminal",
      small: true,
      errorCorrectionLevel: "L",
    });
    console.log("\n" + qrText);
    return true;
  } catch (err: unknown) {
    log.debug("QR code library not available, trying qrencode", { error: err });
    return false;
  }
}

/** Attempt to render a QR code using the system qrencode binary. */
async function renderQrCodeViaBinary(uri: string): Promise<boolean> {
  try {
    const cmd = new Deno.Command("qrencode", {
      args: ["-t", "UTF8", "-o", "-", uri],
      stdout: "piped",
      stderr: "piped",
    });
    const output = await cmd.output();
    if (output.success) {
      console.log("\n" + new TextDecoder().decode(output.stdout));
      return true;
    }
  } catch (_fallbackErr: unknown) {
    log.debug("qrencode binary not available");
  }
  return false;
}

/** Print a fallback message with the raw URI and a web QR generator link. */
function printQrCodeFallback(uri: string): void {
  console.log(
    "\nCould not render QR code. Open this URI in a QR code generator:",
  );
  console.log(`\n  ${uri}\n`);
  console.log(
    "Or visit: https://api.qrserver.com/v1/create-qr-code/?data=" +
      encodeURIComponent(uri),
  );
}

/**
 * Render a URI as a QR code in the terminal.
 *
 * @param uri - The sgnl:// URI to encode.
 */
export async function renderQrCode(uri: string): Promise<void> {
  if (await renderQrCodeViaLibrary(uri)) return;
  if (await renderQrCodeViaBinary(uri)) return;
  printQrCodeFallback(uri);
}
