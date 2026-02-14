/**
 * Signal channel guided setup.
 *
 * Handles signal-cli binary installation (download from GitHub releases),
 * device linking with QR code display, and daemon startup.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { resolveBaseDir } from "../../cli/paths.ts";

/** Result of the guided Signal setup flow. */
export interface SignalSetupResult {
  readonly account: string;
  readonly endpoint: string;
}

/** GitHub release API response shape (subset). */
interface GitHubRelease {
  readonly tag_name: string;
  readonly assets: readonly { readonly name: string; readonly browser_download_url: string; readonly size: number }[];
}

// ─── Binary resolution ────────────────────────────────────────────────────────

/** Return the directory where Triggerfish stores managed binaries. */
export function resolveSignalCliBinDir(): string {
  return `${resolveBaseDir()}/bin`;
}

/**
 * Find signal-cli binary — check PATH first, then Triggerfish's managed bin dir.
 *
 * @returns The version string and resolved binary path, or an error.
 */
export async function checkSignalCli(): Promise<Result<{ version: string; path: string }, string>> {
  // 1. Check PATH
  const pathResult = await trySignalCli("signal-cli");
  if (pathResult.ok) return pathResult;

  // 2. Check managed install dir
  const binDir = resolveSignalCliBinDir();

  // 2a. Check flat binary (native build extracts directly)
  const flatResult = await trySignalCli(`${binDir}/signal-cli`);
  if (flatResult.ok) return flatResult;

  // 2b. Check nested directories (JVM build extracts to signal-cli-{version}/bin/)
  try {
    for await (const entry of Deno.readDir(binDir)) {
      if (entry.isDirectory && entry.name.startsWith("signal-cli-")) {
        const candidate = `${binDir}/${entry.name}/bin/signal-cli`;
        const result = await trySignalCli(candidate);
        if (result.ok) return result;
      }
    }
  } catch {
    // binDir doesn't exist yet
  }

  return { ok: false, error: "signal-cli not found" };
}

/** Try running a signal-cli binary and return version + path if it works. */
async function trySignalCli(path: string): Promise<Result<{ version: string; path: string }, string>> {
  try {
    const cmd = new Deno.Command(path, { args: ["--version"], stdout: "piped", stderr: "piped" });
    const output = await cmd.output();
    if (output.success) {
      const version = new TextDecoder().decode(output.stdout).trim();
      return { ok: true, value: { version, path } };
    }
    return { ok: false, error: "non-zero exit" };
  } catch {
    return { ok: false, error: "not found" };
  }
}

// ─── Installation ─────────────────────────────────────────────────────────────

/**
 * Fetch the latest signal-cli version from GitHub releases.
 *
 * @returns Version string (e.g. "0.13.24") and asset list.
 */
export async function fetchLatestVersion(): Promise<Result<GitHubRelease, string>> {
  try {
    const resp = await fetch("https://api.github.com/repos/AsamK/signal-cli/releases/latest", {
      headers: { "Accept": "application/vnd.github+json" },
    });
    if (!resp.ok) {
      return { ok: false, error: `GitHub API returned ${resp.status}: ${await resp.text()}` };
    }
    const release = await resp.json() as GitHubRelease;
    return { ok: true, value: release };
  } catch (err) {
    return { ok: false, error: `Failed to fetch releases: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Check if Java 21+ is available on PATH.
 *
 * @returns Java version string, or error.
 */
export async function checkJava(): Promise<Result<string, string>> {
  try {
    const cmd = new Deno.Command("java", { args: ["--version"], stdout: "piped", stderr: "piped" });
    const output = await cmd.output();
    if (!output.success) {
      return { ok: false, error: "java returned non-zero exit code" };
    }
    const versionText = new TextDecoder().decode(output.stdout).trim();
    // Parse major version from "openjdk 21.0.1 ..." or "java 21 ..."
    const match = versionText.match(/(\d+)\.\d+/);
    if (match) {
      const major = parseInt(match[1], 10);
      if (major >= 21) {
        return { ok: true, value: versionText.split("\n")[0] };
      }
      return { ok: false, error: `Java ${major} found, but signal-cli requires Java 21+` };
    }
    return { ok: true, value: versionText.split("\n")[0] };
  } catch {
    return { ok: false, error: "java not found on PATH" };
  }
}

/**
 * Download and install signal-cli to Triggerfish's managed bin directory.
 *
 * On Linux: tries native build first (no Java needed), falls back to JVM build.
 * On macOS/other: uses JVM build (requires Java 21+).
 *
 * @param release - GitHub release metadata.
 * @returns Path to the installed signal-cli binary.
 */
export async function downloadSignalCli(release: GitHubRelease): Promise<Result<string, string>> {
  const version = release.tag_name.replace(/^v/, "");
  const binDir = resolveSignalCliBinDir();
  const installDir = `${binDir}/signal-cli-${version}`;

  // Ensure bin directory exists
  await Deno.mkdir(binDir, { recursive: true });

  const os = Deno.build.os;
  let asset: { name: string; browser_download_url: string; size: number } | undefined;
  let isNative = false;

  // On Linux, prefer the native build
  if (os === "linux") {
    const nativeName = `signal-cli-${version}-Linux-native.tar.gz`;
    asset = release.assets.find((a) => a.name === nativeName);
    if (asset) {
      isNative = true;
    }
  }

  // Fall back to JVM build
  if (!asset) {
    const jvmName = `signal-cli-${version}.tar.gz`;
    asset = release.assets.find((a) => a.name === jvmName);

    if (!asset) {
      return { ok: false, error: `No suitable signal-cli asset found for ${os} in release ${release.tag_name}` };
    }

    // JVM build requires Java
    const javaCheck = await checkJava();
    if (!javaCheck.ok) {
      return { ok: false, error: `JVM build requires Java 21+: ${javaCheck.error}` };
    }
  }

  const sizeMB = (asset.size / 1024 / 1024).toFixed(1);
  console.log(`  Downloading signal-cli ${version} (${isNative ? "native" : "JVM"}, ${sizeMB} MB)...`);

  // Download
  let resp: Response;
  try {
    resp = await fetch(asset.browser_download_url, { redirect: "follow" });
    if (!resp.ok || !resp.body) {
      return { ok: false, error: `Download failed: HTTP ${resp.status}` };
    }
  } catch (err) {
    return { ok: false, error: `Download failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Extract via tar — pipe download stream to `tar xzf - -C binDir`
  try {
    // Clean any previous install of this version
    try { await Deno.remove(installDir, { recursive: true }); } catch { /* doesn't exist */ }

    const tar = new Deno.Command("tar", {
      args: ["xzf", "-", "-C", binDir],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    const child = tar.spawn();
    const writer = child.stdin.getWriter();

    for await (const chunk of resp.body) {
      await writer.write(chunk);
    }
    await writer.close();

    const status = await child.status;
    if (!status.success) {
      const stderr = new TextDecoder().decode(await child.stderr.getReader().read().then(r => r.value ?? new Uint8Array()));
      return { ok: false, error: `tar extraction failed: ${stderr}` };
    }
  } catch (err) {
    return { ok: false, error: `Extraction failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Find the binary — native extracts flat, JVM extracts to signal-cli-{version}/bin/
  const candidates = [
    `${binDir}/signal-cli`,                      // native: flat in binDir
    `${binDir}/signal-cli-${version}/bin/signal-cli`,  // JVM: nested
    `${installDir}/bin/signal-cli`,               // alternate nested
  ];

  let binaryPath: string | null = null;
  for (const candidate of candidates) {
    try {
      await Deno.stat(candidate);
      binaryPath = candidate;
      break;
    } catch { /* try next */ }
  }

  if (!binaryPath) {
    // List what's actually in binDir for debugging
    const entries: string[] = [];
    try {
      for await (const e of Deno.readDir(binDir)) {
        entries.push(e.name);
      }
    } catch { /* */ }
    return { ok: false, error: `Binary not found after extraction. binDir contents: [${entries.join(", ")}]` };
  }

  // Ensure executable
  if (Deno.build.os !== "windows") {
    try {
      await Deno.chmod(binaryPath, 0o755);
    } catch { /* already executable */ }
  }

  // Verify it runs
  const verify = await trySignalCli(binaryPath);
  if (!verify.ok) {
    return { ok: false, error: `Installed binary at ${binaryPath} does not run correctly` };
  }

  console.log(`  Installed: ${verify.value.version}`);
  return { ok: true, value: binaryPath };
}

// ─── Device linking ───────────────────────────────────────────────────────────

/**
 * Run `signal-cli link` and capture the sgnl:// URI.
 *
 * @param deviceName - Name for this linked device.
 * @param signalCliPath - Path to signal-cli binary.
 * @returns The link URI for QR code display.
 */
export async function startLinkProcess(
  deviceName: string,
  signalCliPath: string = "signal-cli",
): Promise<Result<{ uri: string; process: Deno.ChildProcess }, string>> {
  try {
    const cmd = new Deno.Command(signalCliPath, {
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

// ─── QR code rendering ───────────────────────────────────────────────────────

/**
 * Render a URI as a QR code in the terminal.
 *
 * @param uri - The sgnl:// URI to encode.
 */
export async function renderQrCode(uri: string): Promise<void> {
  try {
    const qrcode = await import("npm:qrcode@1.5.4");
    const qrText = await qrcode.toString(uri, {
      type: "terminal",
      small: true,
      errorCorrectionLevel: "L",
    });
    console.log("\n" + qrText);
  } catch {
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
    } catch { /* qrencode not available */ }

    console.log("\nCould not render QR code. Open this URI in a QR code generator:");
    console.log(`\n  ${uri}\n`);
    console.log("Or visit: https://api.qrserver.com/v1/create-qr-code/?data=" + encodeURIComponent(uri));
  }
}

// ─── Daemon management ───────────────────────────────────────────────────────

/**
 * Check if signal-cli daemon is already running on the given endpoint.
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
 * @param account - Phone number (E.164).
 * @param host - TCP hostname. Default: localhost.
 * @param port - TCP port. Default: 7583.
 * @param signalCliPath - Path to signal-cli binary.
 * @returns The child process handle.
 */
export function startDaemon(
  account: string,
  host: string = "localhost",
  port: number = 7583,
  signalCliPath: string = "signal-cli",
): Result<Deno.ChildProcess, string> {
  try {
    const cmd = new Deno.Command(signalCliPath, {
      args: ["-a", account, "daemon", "--tcp", `${host}:${port}`],
      stdout: "null",
      stderr: "null",
    });
    const child = cmd.spawn();
    return { ok: true, value: child };
  } catch (err) {
    return { ok: false, error: `Failed to start signal-cli daemon: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Wait for daemon to become reachable on TCP.
 */
export async function waitForDaemon(host: string, port: number, timeoutMs: number = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDaemonRunning(host, port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
