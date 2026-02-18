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
 * Returns the version string, resolved binary path, and optional JAVA_HOME
 * (set when the managed JRE is needed for a JVM build).
 *
 * @returns The version string, resolved binary path, and optional javaHome.
 */
export async function checkSignalCli(): Promise<Result<{ version: string; path: string; javaHome?: string }, string>> {
  const ext = Deno.build.os === "windows" ? ".bat" : "";

  // 1. Check PATH (system-installed signal-cli, uses system java)
  const pathResult = await trySignalCli(`signal-cli${ext}`);
  if (pathResult.ok) return pathResult;

  // 2. Check managed install dir
  const binDir = resolveSignalCliBinDir();

  // 2a. Check flat binary (native build extracts directly — no Java needed)
  const flatResult = await trySignalCli(`${binDir}/signal-cli${ext}`);
  if (flatResult.ok) return flatResult;

  // 2b. Check nested directories (JVM build extracts to signal-cli-{version}/bin/)
  //     JVM builds need JAVA_HOME — try with managed JRE first, then system java.
  const managedJavaHome = resolveJavaHome();
  const jvmEnv = managedJavaHome ? { JAVA_HOME: managedJavaHome } : undefined;

  try {
    for await (const entry of Deno.readDir(binDir)) {
      if (entry.isDirectory && entry.name.startsWith("signal-cli-")) {
        const candidate = `${binDir}/${entry.name}/bin/signal-cli${ext}`;
        // Try with managed JRE (JAVA_HOME set)
        if (jvmEnv) {
          const result = await trySignalCli(candidate, jvmEnv);
          if (result.ok) {
            return { ok: true, value: { ...result.value, javaHome: managedJavaHome! } };
          }
        }
        // Try without (system java on PATH)
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
async function trySignalCli(path: string, env?: Record<string, string>): Promise<Result<{ version: string; path: string }, string>> {
  try {
    const cmd = new Deno.Command(path, {
      args: ["--version"],
      stdout: "piped",
      stderr: "piped",
      env: env ? { ...Deno.env.toObject(), ...env } : undefined,
    });
    const child = cmd.spawn();

    // Race the process against a 15-second timeout to prevent hanging
    // (Java-based signal-cli can stall on some systems)
    const result = await Promise.race([
      child.output(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
    ]);

    if (result === null) {
      // Timeout — kill the hung process
      try { child.kill(); } catch { /* already dead */ }
      return { ok: false, error: "timed out" };
    }

    if (result.success) {
      const version = new TextDecoder().decode(result.stdout).trim();
      return { ok: true, value: { version, path } };
    }
    return { ok: false, error: "non-zero exit" };
  } catch {
    return { ok: false, error: "not found" };
  }
}

// ─── Installation ─────────────────────────────────────────────────────────────

/** Adoptium API response shape for asset metadata (subset). */
interface AdoptiumAsset {
  readonly binary: {
    readonly package: {
      readonly link: string;
      readonly checksum: string;
      readonly size: number;
      readonly name: string;
    };
  };
  readonly version: {
    readonly openjdk_version: string;
    readonly semver: string;
  };
  readonly release_name: string;
}

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
 * Check if Java 21+ is available — checks managed JRE first, then PATH.
 *
 * @returns Java version string and JAVA_HOME path (if managed), or error.
 */
export async function checkJava(): Promise<Result<{ version: string; javaHome?: string }, string>> {
  // 1. Check managed JRE in ~/.triggerfish/bin/java/
  const managedHome = resolveJavaHome();
  if (managedHome) {
    const javaBin = javaHomeBin(managedHome);
    const result = await tryJava(javaBin);
    if (result.ok) {
      return { ok: true, value: { version: result.value, javaHome: managedHome } };
    }
  }

  // 2. Check system PATH
  const pathResult = await tryJava("java");
  if (pathResult.ok) {
    return { ok: true, value: { version: pathResult.value } };
  }

  return { ok: false, error: "Java 21+ not found (checked ~/.triggerfish/bin/java/ and PATH)" };
}

/** Try running a java binary and verify it's 21+. */
async function tryJava(path: string): Promise<Result<string, string>> {
  try {
    const cmd = new Deno.Command(path, { args: ["--version"], stdout: "piped", stderr: "piped" });
    const child = cmd.spawn();

    // Race against a 15-second timeout to prevent hanging
    const output = await Promise.race([
      child.output(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
    ]);

    if (output === null) {
      try { child.kill(); } catch { /* already dead */ }
      return { ok: false, error: "timed out" };
    }

    if (!output.success) {
      return { ok: false, error: "java returned non-zero exit code" };
    }
    const versionText = new TextDecoder().decode(output.stdout).trim();
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
    return { ok: false, error: "not found" };
  }
}

/** Return the JAVA_HOME for a managed JRE, or null if none installed. */
export function resolveJavaHome(): string | null {
  const javaDir = `${resolveSignalCliBinDir()}/java`;
  try {
    for (const entry of Deno.readDirSync(javaDir)) {
      if (entry.isDirectory && entry.name.startsWith("jdk-")) {
        const candidate = `${javaDir}/${entry.name}`;
        // macOS JRE has Contents/Home structure
        if (Deno.build.os === "darwin") {
          const macHome = `${candidate}/Contents/Home`;
          try {
            Deno.statSync(`${macHome}/bin/java`);
            return macHome;
          } catch { /* not macOS layout */ }
        }
        // Linux / Windows / direct layout
        const javaBinName = Deno.build.os === "windows" ? "java.exe" : "java";
        try {
          Deno.statSync(`${candidate}/bin/${javaBinName}`);
          return candidate;
        } catch { /* try next */ }
      }
    }
  } catch {
    // java dir doesn't exist yet
  }
  return null;
}

/** Return the path to the java binary for a given JAVA_HOME. */
function javaHomeBin(javaHome: string): string {
  return Deno.build.os === "windows"
    ? `${javaHome}/bin/java.exe`
    : `${javaHome}/bin/java`;
}

/**
 * Download and install Eclipse Temurin JRE 21 to ~/.triggerfish/bin/java/.
 *
 * Uses the Adoptium API to fetch the latest JRE 21 GA release.
 *
 * @returns JAVA_HOME path for the installed JRE.
 */
export async function downloadJre(): Promise<Result<string, string>> {
  const javaDir = `${resolveSignalCliBinDir()}/java`;
  await Deno.mkdir(javaDir, { recursive: true });

  // Map Deno.build to Adoptium API parameters
  const osMap: Record<string, string> = { linux: "linux", darwin: "mac", windows: "windows" };
  const archMap: Record<string, string> = { x86_64: "x64", aarch64: "aarch64" };

  const adoptOs = osMap[Deno.build.os];
  const adoptArch = archMap[Deno.build.arch];

  if (!adoptOs || !adoptArch) {
    return { ok: false, error: `Unsupported platform: ${Deno.build.os}/${Deno.build.arch}` };
  }

  // Fetch metadata to get download URL and size
  console.log("  Fetching JRE 21 release info...");
  let assets: AdoptiumAsset[];
  try {
    const metaUrl = `https://api.adoptium.net/v3/assets/latest/21/hotspot?image_type=jre&os=${adoptOs}&architecture=${adoptArch}`;
    const metaResp = await fetch(metaUrl);
    if (!metaResp.ok) {
      return { ok: false, error: `Adoptium API returned ${metaResp.status}: ${await metaResp.text()}` };
    }
    assets = await metaResp.json() as AdoptiumAsset[];
  } catch (err) {
    return { ok: false, error: `Failed to fetch JRE metadata: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (assets.length === 0) {
    return { ok: false, error: `No JRE 21 release found for ${adoptOs}/${adoptArch}` };
  }

  // Pick the right archive format: .zip for Windows, .tar.gz for others
  const isWindows = Deno.build.os === "windows";
  const ext = isWindows ? ".zip" : ".tar.gz";
  const asset = assets.find((a) => a.binary.package.name.endsWith(ext));
  if (!asset) {
    return { ok: false, error: `No ${ext} JRE asset found` };
  }

  const sizeMB = (asset.binary.package.size / 1024 / 1024).toFixed(1);
  const releaseName = asset.release_name;
  console.log(`  Downloading JRE 21 (${releaseName}, ${sizeMB} MB)...`);

  // Download
  let resp: Response;
  try {
    resp = await fetch(asset.binary.package.link, { redirect: "follow" });
    if (!resp.ok || !resp.body) {
      return { ok: false, error: `JRE download failed: HTTP ${resp.status}` };
    }
  } catch (err) {
    return { ok: false, error: `JRE download failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Extract archive to javaDir
  try {
    if (isWindows) {
      // Write .zip to temp file, then extract with PowerShell
      const tmpZip = `${javaDir}\\jre-download.zip`;
      const file = await Deno.open(tmpZip, { write: true, create: true, truncate: true });
      for await (const chunk of resp.body) {
        await file.write(chunk);
      }
      file.close();
      const ps = new Deno.Command("powershell", {
        args: ["-NoProfile", "-Command", `Expand-Archive -Force -Path '${tmpZip}' -DestinationPath '${javaDir}'`],
        stdout: "piped",
        stderr: "piped",
      });
      const psOut = await ps.output();
      await Deno.remove(tmpZip).catch(() => {});
      if (!psOut.success) {
        const stderr = new TextDecoder().decode(psOut.stderr);
        return { ok: false, error: `JRE zip extraction failed: ${stderr}` };
      }
    } else {
      const tar = new Deno.Command("tar", {
        args: ["xzf", "-", "-C", javaDir],
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
        const stderr = new TextDecoder().decode(await child.stderr.getReader().read().then((r) => r.value ?? new Uint8Array()));
        return { ok: false, error: `JRE tar extraction failed: ${stderr}` };
      }
    }
  } catch (err) {
    return { ok: false, error: `JRE extraction failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Resolve JAVA_HOME from extracted directory
  const javaHome = resolveJavaHome();
  if (!javaHome) {
    // List what was extracted for debugging
    const entries: string[] = [];
    try {
      for await (const e of Deno.readDir(javaDir)) entries.push(e.name);
    } catch { /* */ }
    return { ok: false, error: `JRE extracted but JAVA_HOME not found. Contents: [${entries.join(", ")}]` };
  }

  // Verify it works
  const javaBin = javaHomeBin(javaHome);
  const verify = await tryJava(javaBin);
  if (!verify.ok) {
    return { ok: false, error: `Installed JRE at ${javaBin} does not run correctly: ${verify.error}` };
  }

  console.log(`  Installed: ${verify.value}`);
  return { ok: true, value: javaHome };
}

/** Result of downloading signal-cli: binary path and optional JAVA_HOME. */
export interface SignalCliInstall {
  /** Path to the signal-cli binary. */
  readonly path: string;
  /** JAVA_HOME for managed JRE, if the JVM build was installed. */
  readonly javaHome?: string;
}

/**
 * Download and install signal-cli to Triggerfish's managed bin directory.
 *
 * On Linux: tries native build first (no Java needed), falls back to JVM build.
 * On macOS/other: uses JVM build (requires Java 21+, auto-downloads portable JRE if missing).
 *
 * @param release - GitHub release metadata.
 * @returns Path to the installed signal-cli binary and optional JAVA_HOME.
 */
export async function downloadSignalCli(release: GitHubRelease): Promise<Result<SignalCliInstall, string>> {
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
  let javaHome: string | undefined;
  if (!asset) {
    const jvmName = `signal-cli-${version}.tar.gz`;
    asset = release.assets.find((a) => a.name === jvmName);

    if (!asset) {
      return { ok: false, error: `No suitable signal-cli asset found for ${os} in release ${release.tag_name}` };
    }

    // JVM build requires Java — check or download
    const javaCheck = await checkJava();
    if (javaCheck.ok) {
      javaHome = javaCheck.value.javaHome;
    } else {
      console.log("  Java 21+ not found — downloading portable JRE...");
      const jreResult = await downloadJre();
      if (!jreResult.ok) {
        return { ok: false, error: `JVM build requires Java 21+ and auto-install failed: ${jreResult.error}` };
      }
      javaHome = jreResult.value;
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
  const candidates = Deno.build.os === "windows"
    ? [
        `${binDir}/signal-cli.bat`,                           // native: flat in binDir (Windows)
        `${binDir}/signal-cli-${version}/bin/signal-cli.bat`, // JVM: nested (Windows)
        `${installDir}/bin/signal-cli.bat`,                   // alternate nested (Windows)
      ]
    : [
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

  // Verify it runs (pass JAVA_HOME for JVM builds)
  const verifyEnv = javaHome ? { JAVA_HOME: javaHome } : undefined;
  const verify = await trySignalCli(binaryPath, verifyEnv);
  if (!verify.ok) {
    return { ok: false, error: `Installed binary at ${binaryPath} does not run correctly` };
  }

  console.log(`  Installed: ${verify.value.version}`);
  return { ok: true, value: { path: binaryPath, javaHome } };
}

// ─── Device linking ───────────────────────────────────────────────────────────

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
    const qrcode = await import("qrcode");
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

/** Normalize "localhost" to "127.0.0.1" — signal-cli binds IPv4 only. */
function normalizeHost(host: string): string {
  return host === "localhost" ? "127.0.0.1" : host;
}

/**
 * Check if signal-cli daemon is already running on the given endpoint.
 */
export async function isDaemonRunning(host: string, port: number): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: normalizeHost(host), port });
    conn.close();
    return true;
  } catch {
    return false;
  }
}

/** Result of starting the signal-cli daemon. */
export interface DaemonHandle {
  /** The child process. */
  readonly child: Deno.ChildProcess;
  /** Collect any stderr output (for diagnostics on failure). */
  readonly stderrText: () => Promise<string>;
}

/**
 * Start signal-cli daemon on a TCP socket.
 *
 * Normalizes "localhost" to "127.0.0.1" so signal-cli binds IPv4 — on
 * Windows dual-stack systems Java resolves "localhost" to `::1` (IPv6),
 * causing connection refused when Triggerfish probes `127.0.0.1`.
 *
 * @param account - Phone number (E.164).
 * @param host - TCP hostname. Default: localhost.
 * @param port - TCP port. Default: 7583.
 * @param signalCliPath - Path to signal-cli binary.
 * @param javaHome - Optional JAVA_HOME for managed JRE.
 * @returns A handle with the child process and stderr accessor.
 */
export function startDaemon(
  account: string,
  host: string = "localhost",
  port: number = 7583,
  signalCliPath: string = "signal-cli",
  javaHome?: string,
): Result<DaemonHandle, string> {
  try {
    const env = javaHome
      ? { ...Deno.env.toObject(), JAVA_HOME: javaHome }
      : undefined;
    const normalizedHost = normalizeHost(host);
    const cmd = new Deno.Command(signalCliPath, {
      args: ["-a", account, "daemon", "--tcp", `${normalizedHost}:${port}`],
      stdout: "null",
      stderr: "piped",
      env,
    });
    const child = cmd.spawn();

    // Collect stderr lazily — only read when caller needs diagnostics
    let stderrPromise: Promise<string> | null = null;
    const stderrText = (): Promise<string> => {
      if (!stderrPromise) {
        stderrPromise = (async () => {
          try {
            const reader = child.stderr.getReader();
            const chunks: Uint8Array[] = [];
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
            const total = chunks.reduce((n, c) => n + c.length, 0);
            const merged = new Uint8Array(total);
            let offset = 0;
            for (const c of chunks) {
              merged.set(c, offset);
              offset += c.length;
            }
            return new TextDecoder().decode(merged).trim();
          } catch {
            return "";
          }
        })();
      }
      return stderrPromise;
    };

    return { ok: true, value: { child, stderrText } };
  } catch (err) {
    return { ok: false, error: `Failed to start signal-cli daemon: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Wait for daemon to become reachable on TCP.
 */
export async function waitForDaemon(host: string, port: number, timeoutMs: number = 60000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDaemonRunning(host, port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
