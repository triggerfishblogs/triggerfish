/**
 * Signal-cli and JRE download/installation from GitHub and Adoptium.
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { Result } from "../../core/types/classification.ts";
import type { GitHubRelease } from "./setup_resolver.ts";
import {
  checkJava,
  javaHomeBin,
  resolveJavaHome,
  resolveSignalCliBinDir,
  tryJava,
  trySignalCli,
} from "./setup_resolver.ts";

const log = createLogger("signal");

/** Extract a tar.gz archive by piping a response body to `tar xzf`. */
async function extractTarGzFromResponse(
  body: ReadableStream<Uint8Array>,
  destDir: string,
): Promise<Result<void, string>> {
  const tar = new Deno.Command("tar", {
    args: ["xzf", "-", "-C", destDir],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = tar.spawn();
  const writer = child.stdin.getWriter();

  for await (const chunk of body) {
    await writer.write(chunk);
  }
  await writer.close();

  const status = await child.status;
  if (!status.success) {
    const stderr = new TextDecoder().decode(
      await child.stderr.getReader().read().then((r) =>
        r.value ?? new Uint8Array()
      ),
    );
    return { ok: false, error: `tar extraction failed: ${stderr}` };
  }
  return { ok: true, value: undefined };
}

/** Extract a zip archive on Windows via PowerShell. */
async function extractZipOnWindows(
  body: ReadableStream<Uint8Array>,
  destDir: string,
): Promise<Result<void, string>> {
  const tmpZip = `${destDir}\\jre-download.zip`;
  const file = await Deno.open(tmpZip, {
    write: true,
    create: true,
    truncate: true,
  });
  for await (const chunk of body) {
    await file.write(chunk);
  }
  file.close();
  const ps = new Deno.Command("powershell", {
    args: [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Force -Path '${tmpZip}' -DestinationPath '${destDir}'`,
    ],
    stdout: "piped",
    stderr: "piped",
  });
  const psOut = await ps.output();
  await Deno.remove(tmpZip).catch((err: unknown) => {
    log.debug("Temp zip cleanup failed", {
      path: tmpZip,
      error: err instanceof Error ? err.message : String(err),
    });
  });
  if (!psOut.success) {
    const stderr = new TextDecoder().decode(psOut.stderr);
    return { ok: false, error: `zip extraction failed: ${stderr}` };
  }
  return { ok: true, value: undefined };
}

/** Download a URL and extract the archive to a destination directory. */
async function downloadAndExtractArchive(
  url: string,
  destDir: string,
  isWindows: boolean,
): Promise<Result<void, string>> {
  let resp: Response;
  try {
    resp = await fetch(url, { redirect: "follow" });
    if (!resp.ok || !resp.body) {
      return { ok: false, error: `Download failed: HTTP ${resp.status}` };
    }
  } catch (err) {
    return {
      ok: false,
      error: `Download failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (isWindows) {
    return extractZipOnWindows(resp.body, destDir);
  }
  return extractTarGzFromResponse(resp.body, destDir);
}

/** List directory entries for debugging. */
async function listDirectoryEntries(dirPath: string): Promise<string[]> {
  const entries: string[] = [];
  try {
    for await (const e of Deno.readDir(dirPath)) entries.push(e.name);
  } catch (_err: unknown) {
    log.debug("Directory listing failed", { path: dirPath });
  }
  return entries;
}

/** Find the first existing file from a list of candidates. */
async function locateFirstExistingPath(
  candidates: string[],
): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await Deno.stat(candidate);
      return candidate;
    } catch (_err: unknown) {
      log.debug("Binary candidate not found", { path: candidate });
    }
  }
  return null;
}

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
export async function fetchLatestVersion(): Promise<
  Result<GitHubRelease, string>
> {
  try {
    const resp = await fetch(
      "https://api.github.com/repos/AsamK/signal-cli/releases/latest",
      {
        headers: { "Accept": "application/vnd.github+json" },
      },
    );
    if (!resp.ok) {
      return {
        ok: false,
        error: `GitHub API returned ${resp.status}: ${await resp.text()}`,
      };
    }
    const release = await resp.json() as GitHubRelease;
    return { ok: true, value: release };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to fetch releases: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
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
  const osMap: Record<string, string> = {
    linux: "linux",
    darwin: "mac",
    windows: "windows",
  };
  const archMap: Record<string, string> = { x86_64: "x64", aarch64: "aarch64" };

  const adoptOs = osMap[Deno.build.os];
  const adoptArch = archMap[Deno.build.arch];

  if (!adoptOs || !adoptArch) {
    return {
      ok: false,
      error: `Unsupported platform: ${Deno.build.os}/${Deno.build.arch}`,
    };
  }

  // Fetch metadata to get download URL and size
  console.log("  Fetching JRE 21 release info...");
  let assets: AdoptiumAsset[];
  try {
    const metaUrl =
      `https://api.adoptium.net/v3/assets/latest/21/hotspot?image_type=jre&os=${adoptOs}&architecture=${adoptArch}`;
    const metaResp = await fetch(metaUrl);
    if (!metaResp.ok) {
      return {
        ok: false,
        error: `Adoptium API returned ${metaResp.status}: ${await metaResp
          .text()}`,
      };
    }
    assets = await metaResp.json() as AdoptiumAsset[];
  } catch (err) {
    return {
      ok: false,
      error: `Failed to fetch JRE metadata: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (assets.length === 0) {
    return {
      ok: false,
      error: `No JRE 21 release found for ${adoptOs}/${adoptArch}`,
    };
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

  // Download and extract
  const extractResult = await downloadAndExtractArchive(
    asset.binary.package.link,
    javaDir,
    isWindows,
  );
  if (!extractResult.ok) {
    return { ok: false, error: `JRE ${extractResult.error}` };
  }

  // Resolve JAVA_HOME from extracted directory
  const javaHome = resolveJavaHome();
  if (!javaHome) {
    const entries = await listDirectoryEntries(javaDir);
    return {
      ok: false,
      error: `JRE extracted but JAVA_HOME not found. Contents: [${
        entries.join(", ")
      }]`,
    };
  }

  // Verify it works
  const javaBin = javaHomeBin(javaHome);
  const verify = await tryJava(javaBin);
  if (!verify.ok) {
    return {
      ok: false,
      error:
        `Installed JRE at ${javaBin} does not run correctly: ${verify.error}`,
    };
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
export async function downloadSignalCli(
  release: GitHubRelease,
): Promise<Result<SignalCliInstall, string>> {
  const version = release.tag_name.replace(/^v/, "");
  const binDir = resolveSignalCliBinDir();
  const installDir = `${binDir}/signal-cli-${version}`;

  // Ensure bin directory exists
  await Deno.mkdir(binDir, { recursive: true });

  const os = Deno.build.os;
  let asset:
    | { name: string; browser_download_url: string; size: number }
    | undefined;
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
      return {
        ok: false,
        error:
          `No suitable signal-cli asset found for ${os} in release ${release.tag_name}`,
      };
    }

    // JVM build requires Java — check or download
    const javaCheck = await checkJava();
    if (javaCheck.ok) {
      javaHome = javaCheck.value.javaHome;
    } else {
      console.log("  Java 21+ not found — downloading portable JRE...");
      const jreResult = await downloadJre();
      if (!jreResult.ok) {
        return {
          ok: false,
          error:
            `JVM build requires Java 21+ and auto-install failed: ${jreResult.error}`,
        };
      }
      javaHome = jreResult.value;
    }
  }

  const sizeMB = (asset.size / 1024 / 1024).toFixed(1);
  console.log(
    `  Downloading signal-cli ${version} (${
      isNative ? "native" : "JVM"
    }, ${sizeMB} MB)...`,
  );

  // Clean any previous install of this version
  try {
    await Deno.remove(installDir, { recursive: true });
  } catch (_err: unknown) {
    log.debug("Previous signal-cli install directory removal skipped", {
      path: installDir,
    });
  }

  // Download and extract
  const extractResult = await downloadAndExtractArchive(
    asset.browser_download_url,
    binDir,
    false,
  );
  if (!extractResult.ok) {
    return extractResult;
  }

  // Find the binary — native extracts flat, JVM extracts to signal-cli-{version}/bin/
  const ext = Deno.build.os === "windows" ? ".bat" : "";
  const candidates = [
    `${binDir}/signal-cli${ext}`,
    `${binDir}/signal-cli-${version}/bin/signal-cli${ext}`,
    `${installDir}/bin/signal-cli${ext}`,
  ];

  const binaryPath = await locateFirstExistingPath(candidates);
  if (!binaryPath) {
    const entries = await listDirectoryEntries(binDir);
    return {
      ok: false,
      error: `Binary not found after extraction. binDir contents: [${
        entries.join(", ")
      }]`,
    };
  }

  // Ensure executable
  if (Deno.build.os !== "windows") {
    try {
      await Deno.chmod(binaryPath, 0o755);
    } catch (_err: unknown) {
      log.debug("Signal-cli binary chmod failed", { path: binaryPath });
    }
  }

  // Verify it runs (pass JAVA_HOME for JVM builds)
  const verifyEnv = javaHome ? { JAVA_HOME: javaHome } : undefined;
  const verify = await trySignalCli(binaryPath, verifyEnv);
  if (!verify.ok) {
    return {
      ok: false,
      error: `Installed binary at ${binaryPath} does not run correctly`,
    };
  }

  console.log(`  Installed: ${verify.value.version}`);
  return { ok: true, value: { path: binaryPath, javaHome } };
}
