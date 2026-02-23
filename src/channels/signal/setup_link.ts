/**
 * Signal device linking and QR code rendering.
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { Result } from "../../core/types/classification.ts";

const log = createLogger("signal");

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
      const stderrReader = child.stderr.getReader();
      const { value: errBytes } = await stderrReader.read();
      stderrReader.releaseLock();
      const errMsg = errBytes
        ? decoder.decode(errBytes).trim()
        : "Unknown error";
      return {
        ok: false,
        error:
          `signal-cli link did not produce a URI. Got: "${uri}". stderr: ${errMsg}`,
      };
    }

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
