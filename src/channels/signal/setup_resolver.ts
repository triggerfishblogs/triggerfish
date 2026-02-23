/**
 * Signal binary and Java resolution — find signal-cli and JRE on disk.
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { Result } from "../../core/types/classification.ts";
import { resolveBaseDir } from "../../cli/config/paths.ts";

const log = createLogger("signal");

/**
 * Minimum known-good signal-cli version. Warn (but don't block) if the
 * installed version is older. Update this constant when a newer release
 * has been validated.
 */
export const SIGNAL_CLI_KNOWN_GOOD_VERSION = "0.13.0";

/** Result of the guided Signal setup flow. */
export interface SignalSetupResult {
  readonly account: string;
  readonly endpoint: string;
}

/** GitHub release API response shape (subset). */
export interface GitHubRelease {
  readonly tag_name: string;
  readonly assets: readonly {
    readonly name: string;
    readonly browser_download_url: string;
    readonly size: number;
  }[];
}

// ─── Binary resolution ───────────────────────────────────────────

/** Return the directory where Triggerfish stores managed binaries. */
export function resolveSignalCliBinDir(): string {
  return `${resolveBaseDir()}/bin`;
}

/**
 * Log a warning if the installed signal-cli version is older than the known-good version.
 *
 * @param versionOutput - Output from `signal-cli --version` (e.g. "signal-cli 0.13.24").
 */
export function warnIfOldVersion(versionOutput: string): void {
  const match = versionOutput.match(/(\d+\.\d+\.\d+)/);
  if (!match) return;
  const installed = match[1].split(".").map(Number);
  const known = SIGNAL_CLI_KNOWN_GOOD_VERSION.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const inst = installed[i] ?? 0;
    const know = known[i] ?? 0;
    if (inst < know) {
      console.warn(
        `\u26a0 signal-cli ${
          match[1]
        } is older than known-good ${SIGNAL_CLI_KNOWN_GOOD_VERSION}. Consider upgrading.`,
      );
      return;
    }
    if (inst > know) return;
  }
}

/** Race a spawned process against a 15-second timeout to prevent hanging. */
async function raceProcessWithTimeout(
  child: Deno.ChildProcess,
): Promise<Deno.CommandOutput | null> {
  const result = await Promise.race([
    child.output(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
  ]);
  if (result === null) {
    try {
      child.kill();
    } catch (_err: unknown) {
      log.debug("Process cleanup: already terminated");
    }
  }
  return result;
}

/** Spawn a signal-cli process with optional env overrides. */
function spawnSignalCliVersion(
  path: string,
  env?: Record<string, string>,
): Deno.ChildProcess {
  const cmd = new Deno.Command(path, {
    args: ["--version"],
    stdout: "piped",
    stderr: "piped",
    env: env ? { ...Deno.env.toObject(), ...env } : undefined,
  });
  return cmd.spawn();
}

/** Try running a signal-cli binary and return version + path if it works. */
export async function trySignalCli(
  path: string,
  env?: Record<string, string>,
): Promise<Result<{ version: string; path: string }, string>> {
  try {
    const child = spawnSignalCliVersion(path, env);
    const result = await raceProcessWithTimeout(child);
    if (result === null) return { ok: false, error: "timed out" };
    if (result.success) {
      const version = new TextDecoder().decode(result.stdout).trim();
      return { ok: true, value: { version, path } };
    }
    return { ok: false, error: "non-zero exit" };
  } catch (_err: unknown) {
    log.debug("Signal-cli binary not found", { path });
    return { ok: false, error: "not found" };
  }
}

/** Try a JVM build candidate with managed JRE first, then system Java. */
async function tryJvmCandidate(
  candidate: string,
  jvmEnv: Record<string, string> | undefined,
  managedJavaHome: string | null,
): Promise<
  Result<{ version: string; path: string; javaHome?: string }, string>
> {
  if (jvmEnv) {
    const result = await trySignalCli(candidate, jvmEnv);
    if (result.ok) {
      return {
        ok: true,
        value: { ...result.value, javaHome: managedJavaHome! },
      };
    }
  }
  return trySignalCli(candidate);
}

/** Scan nested JVM build directories for a working signal-cli binary. */
async function scanJvmBuildDirs(
  binDir: string,
  ext: string,
  managedJavaHome: string | null,
): Promise<
  Result<{ version: string; path: string; javaHome?: string }, string>
> {
  const jvmEnv = managedJavaHome ? { JAVA_HOME: managedJavaHome } : undefined;
  try {
    for await (const entry of Deno.readDir(binDir)) {
      if (!entry.isDirectory || !entry.name.startsWith("signal-cli-")) continue;
      const candidate = `${binDir}/${entry.name}/bin/signal-cli${ext}`;
      const result = await tryJvmCandidate(candidate, jvmEnv, managedJavaHome);
      if (result.ok) return result;
    }
  } catch (_err: unknown) {
    log.debug("File access failed", { path: binDir });
  }
  return { ok: false, error: "signal-cli not found in JVM dirs" };
}

/**
 * Find signal-cli binary — check PATH first, then Triggerfish's managed bin dir.
 *
 * Returns the version string, resolved binary path, and optional JAVA_HOME
 * (set when the managed JRE is needed for a JVM build).
 */
export async function checkSignalCli(): Promise<
  Result<{ version: string; path: string; javaHome?: string }, string>
> {
  const ext = Deno.build.os === "windows" ? ".bat" : "";

  const pathResult = await trySignalCli(`signal-cli${ext}`);
  if (pathResult.ok) {
    warnIfOldVersion(pathResult.value.version);
    return pathResult;
  }

  const binDir = resolveSignalCliBinDir();
  const flatResult = await trySignalCli(`${binDir}/signal-cli${ext}`);
  if (flatResult.ok) return flatResult;

  const jvmResult = await scanJvmBuildDirs(binDir, ext, resolveJavaHome());
  if (jvmResult.ok) return jvmResult;

  return { ok: false, error: "signal-cli not found" };
}

// ─── Java resolution ─────────────────────────────────────────────

/** Validate that the Java version is 21 or newer. */
function validateJavaVersion(versionText: string): Result<string, string> {
  const firstLine = versionText.split("\n")[0];
  const match = versionText.match(/(\d+)\.\d+/);
  if (!match) return { ok: true, value: firstLine };
  const major = parseInt(match[1], 10);
  if (major >= 21) return { ok: true, value: firstLine };
  return {
    ok: false,
    error: `Java ${major} found, but signal-cli requires Java 21+`,
  };
}

/** Try running a java binary and verify it's 21+. */
export async function tryJava(path: string): Promise<Result<string, string>> {
  try {
    const cmd = new Deno.Command(path, {
      args: ["--version"],
      stdout: "piped",
      stderr: "piped",
    });
    const child = cmd.spawn();
    const output = await raceProcessWithTimeout(child);
    if (output === null) return { ok: false, error: "timed out" };
    if (!output.success) {
      return { ok: false, error: "java returned non-zero exit code" };
    }
    const versionText = new TextDecoder().decode(output.stdout).trim();
    return validateJavaVersion(versionText);
  } catch (_err: unknown) {
    log.debug("Java binary not found", { path });
    return { ok: false, error: "not found" };
  }
}

/** Probe a JDK candidate directory for a java binary, returning JAVA_HOME or null. */
function probeJdkCandidate(candidate: string): string | null {
  if (Deno.build.os === "darwin") {
    const macHome = `${candidate}/Contents/Home`;
    try {
      Deno.statSync(`${macHome}/bin/java`);
      return macHome;
    } catch (_err: unknown) {
      log.debug("File access failed", { path: `${macHome}/bin/java` });
    }
  }
  const javaBinName = Deno.build.os === "windows" ? "java.exe" : "java";
  try {
    Deno.statSync(`${candidate}/bin/${javaBinName}`);
    return candidate;
  } catch (_err: unknown) {
    log.debug("File access failed", {
      path: `${candidate}/bin/${javaBinName}`,
    });
  }
  return null;
}

/** Return the JAVA_HOME for a managed JRE, or null if none installed. */
export function resolveJavaHome(): string | null {
  const javaDir = `${resolveSignalCliBinDir()}/java`;
  try {
    for (const entry of Deno.readDirSync(javaDir)) {
      if (!entry.isDirectory || !entry.name.startsWith("jdk-")) continue;
      const result = probeJdkCandidate(`${javaDir}/${entry.name}`);
      if (result !== null) return result;
    }
  } catch (_err: unknown) {
    log.debug("File access failed", { path: javaDir });
  }
  return null;
}

/** Return the path to the java binary for a given JAVA_HOME. */
export function javaHomeBin(javaHome: string): string {
  return Deno.build.os === "windows"
    ? `${javaHome}/bin/java.exe`
    : `${javaHome}/bin/java`;
}

/**
 * Check if Java 21+ is available — checks managed JRE first, then PATH.
 *
 * @returns Java version string and JAVA_HOME path (if managed), or error.
 */
export async function checkJava(): Promise<
  Result<{ version: string; javaHome?: string }, string>
> {
  // 1. Check managed JRE in ~/.triggerfish/bin/java/
  const managedHome = resolveJavaHome();
  if (managedHome) {
    const javaBin = javaHomeBin(managedHome);
    const result = await tryJava(javaBin);
    if (result.ok) {
      return {
        ok: true,
        value: { version: result.value, javaHome: managedHome },
      };
    }
  }

  // 2. Check system PATH
  const pathResult = await tryJava("java");
  if (pathResult.ok) {
    return { ok: true, value: { version: pathResult.value } };
  }

  return {
    ok: false,
    error: "Java 21+ not found (checked ~/.triggerfish/bin/java/ and PATH)",
  };
}
