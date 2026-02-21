/**
 * Chromium binary detection and CDP connection helpers.
 *
 * Detects Chromium-family browsers across Linux, macOS, and Windows
 * via well-known paths, PATH lookup, and Flatpak exports. Also provides
 * CDP endpoint polling and port allocation utilities.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";

// ─── Internal types ──────────────────────────────────────────────────────────

/** How Chrome was detected and should be launched. */
export interface ChromeDetection {
  readonly kind: "direct" | "flatpak";
  /** Executable path (direct) or Flatpak app ID (flatpak). */
  readonly target: string;
  /** Path to the flatpak binary, e.g. "/usr/bin/flatpak". */
  readonly flatpakBin?: string;
}

/** Shape of the CDP `/json/version` response. */
export interface CdpVersionResponse {
  readonly webSocketDebuggerUrl: string;
  readonly Browser: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_LAUNCH_TIMEOUT_MS = 30_000;
export const CDP_POLL_INTERVAL_MS = 200;
export const DEFAULT_VIEWPORT = { width: 1280, height: 900 };

/** Flatpak app IDs to check, in priority order. */
const FLATPAK_APP_IDS = [
  "com.google.Chrome",
  "com.google.ChromeDev",
  "org.chromium.Chromium",
  "com.brave.Browser",
] as const;

// ─── Detection helpers ───────────────────────────────────────────────────────

/**
 * Build the ordered list of well-known Chromium-family executable paths
 * for Windows, resolving standard environment variables at call time.
 */
function getWindowsBrowserPaths(): string[] {
  const pf = Deno.env.get("PROGRAMFILES") ?? "C:\\Program Files";
  const pf86 = Deno.env.get("PROGRAMFILES(X86)") ?? "C:\\Program Files (x86)";
  const local = Deno.env.get("LOCALAPPDATA") ?? "";

  const paths: string[] = [
    // Chrome — system installs
    `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
    `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
    // Brave — system installs
    `${pf}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `${pf86}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    // Microsoft Edge (Chromium-based) — system installs
    `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ];

  if (local) {
    paths.push(
      // Chrome — per-user install
      `${local}\\Google\\Chrome\\Application\\chrome.exe`,
      // Brave — per-user install
      `${local}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
      // Chromium — per-user install
      `${local}\\Chromium\\Application\\chrome.exe`,
    );
  }

  return paths;
}

/** Locate the `flatpak` binary. */
export async function findFlatpakBin(): Promise<string | undefined> {
  for (const p of ["/usr/bin/flatpak", "/usr/local/bin/flatpak"]) {
    try {
      const stat = await Deno.stat(p);
      if (stat.isFile) return p;
    } catch {
      // not found
    }
  }
  return undefined;
}

/**
 * Detect a Chromium-family browser, returning a discriminated union
 * describing whether it is a direct binary or a Flatpak app.
 *
 * Checks direct paths first, then Flatpak system-level, then user-level.
 */
export async function detectChrome(): Promise<ChromeDetection | undefined> {
  // --- 1. Direct binary paths ---
  const linuxPaths = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
    "/usr/bin/microsoft-edge",
    "/usr/bin/brave-browser",
    "/usr/bin/brave",
    "/snap/bin/brave",
  ];

  const darwinPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ];

  const candidates =
    Deno.build.os === "darwin" ? darwinPaths :
    Deno.build.os === "windows" ? getWindowsBrowserPaths() :
    linuxPaths;

  for (const p of candidates) {
    try {
      const stat = await Deno.stat(p);
      if (stat.isFile) return { kind: "direct", target: p };
    } catch {
      // not found, try next
    }
  }

  // Fallback: try 'where' (Windows) or 'which' (Unix) for common browser names
  const isWindows = Deno.build.os === "windows";
  const whichCmd = isWindows ? "where" : "which";
  const names = isWindows
    ? ["chrome.exe", "brave.exe", "msedge.exe"]
    : ["chromium-browser", "chromium", "google-chrome", "brave-browser", "brave"];
  for (const name of names) {
    try {
      const cmd = new Deno.Command(whichCmd, {
        args: [name],
        stdout: "piped",
        stderr: "null",
      });
      const result = await cmd.output();
      if (result.success) {
        // 'where' may return multiple lines; take the first
        const path = new TextDecoder().decode(result.stdout).split(/\r?\n/)[0].trim();
        if (path) return { kind: "direct", target: path };
      }
    } catch {
      // ignore
    }
  }

  // --- 2. Flatpak (system-level then user-level) — Linux only ---
  if (Deno.build.os !== "windows") {
    const flatpakBin = await findFlatpakBin();
    if (flatpakBin) {
      const prefixes = [
        "/var/lib/flatpak/exports/bin",
        `${Deno.env.get("HOME") ?? ""}/.local/share/flatpak/exports/bin`,
      ];

      for (const prefix of prefixes) {
        for (const appId of FLATPAK_APP_IDS) {
          const exportPath = `${prefix}/${appId}`;
          try {
            const stat = await Deno.stat(exportPath);
            if (stat.isFile || stat.isSymlink) {
              return { kind: "flatpak", target: appId, flatpakBin };
            }
          } catch {
            // not found, try next
          }
        }
      }
    }
  }

  return undefined;
}

// ─── Port & CDP helpers ──────────────────────────────────────────────────────

/** Find a free TCP port by binding to port 0 on 127.0.0.1. */
export async function findFreePort(): Promise<number> {
  const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const { port } = listener.addr as Deno.NetAddr;
  listener.close();
  // Small yield to let the OS fully release the port
  await new Promise((r) => setTimeout(r, 10));
  return port;
}

/**
 * Poll the CDP HTTP endpoint until it responds with a valid
 * `webSocketDebuggerUrl`, or until `timeoutMs` elapses.
 */
export async function pollCdpReady(
  port: number,
  timeoutMs: number,
): Promise<Result<CdpVersionResponse, string>> {
  const deadline = Date.now() + timeoutMs;
  const url = `http://127.0.0.1:${port}/json/version`;

  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const body = await resp.json() as CdpVersionResponse;
        if (body.webSocketDebuggerUrl) {
          return { ok: true, value: body };
        }
      }
    } catch {
      // Chrome not ready yet
    }
    await new Promise((r) => setTimeout(r, CDP_POLL_INTERVAL_MS));
  }

  return { ok: false, error: `CDP endpoint on port ${port} not ready after ${timeoutMs}ms` };
}

/**
 * Generic timeout wrapper. Rejects with `msg` if the promise doesn't
 * resolve within `ms` milliseconds.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  msg: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(msg)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
