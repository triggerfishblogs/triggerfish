/**
 * Signal binary and Java resolution — find signal-cli and JRE on disk.
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import { resolveBaseDir } from "../../cli/config/paths.ts";

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
  readonly assets: readonly { readonly name: string; readonly browser_download_url: string; readonly size: number }[];
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
        `\u26a0 signal-cli ${match[1]} is older than known-good ${SIGNAL_CLI_KNOWN_GOOD_VERSION}. Consider upgrading.`,
      );
      return;
    }
    if (inst > know) return;
  }
}

/** Try running a signal-cli binary and return version + path if it works. */
export async function trySignalCli(path: string, env?: Record<string, string>): Promise<Result<{ version: string; path: string }, string>> {
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

/**
 * Find signal-cli binary — check PATH first, then Triggerfish's managed bin dir.
 *
 * Returns the version string, resolved binary path, and optional JAVA_HOME
 * (set when the managed JRE is needed for a JVM build).
 */
export async function checkSignalCli(): Promise<Result<{ version: string; path: string; javaHome?: string }, string>> {
  const ext = Deno.build.os === "windows" ? ".bat" : "";

  // 1. Check PATH (system-installed signal-cli, uses system java)
  const pathResult = await trySignalCli(`signal-cli${ext}`);
  if (pathResult.ok) {
    warnIfOldVersion(pathResult.value.version);
    return pathResult;
  }

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

// ─── Java resolution ─────────────────────────────────────────────

/** Try running a java binary and verify it's 21+. */
export async function tryJava(path: string): Promise<Result<string, string>> {
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
