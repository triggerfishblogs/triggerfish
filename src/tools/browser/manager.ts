/**
 * Multi-agent Chromium lifecycle management for browser automation.
 *
 * Each agent gets an isolated browser profile with classification-aware
 * watermarking. A lower-tainted session cannot reuse a profile that has
 * been used at a higher classification level.
 *
 * Supports two launch strategies:
 * - **direct**: Chromium binary found on the host → uses puppeteer.launch()
 * - **flatpak**: Chrome available only via Flatpak → writes a shell wrapper that
 *   exec-replaces itself with `flatpak run`, then uses puppeteer.launch() with
 *   pipe: true. No TCP port allocation or CDP polling required.
 *
 * @module
 */

import puppeteer from "puppeteer-core";
import type { Browser, Page } from "puppeteer-core";
import type { ClassificationLevel, Result } from "../../core/types/classification.ts";
import type { StorageProvider } from "../../core/storage/provider.ts";
import type { DomainPolicy } from "./domains.ts";
import {
  canAccessProfile,
  escalateWatermark,
  getWatermark,
} from "./watermark.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("browser-manager");

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A running browser instance for a specific agent. */
export interface BrowserInstance {
  /** The agent this instance belongs to. */
  readonly agentId: string;
  /** Filesystem path to the isolated profile directory. */
  readonly profilePath: string;
  /** Classification watermark after launch. */
  readonly watermark: ClassificationLevel;
  /** The puppeteer Page (opaque to consumers outside this module). */
  readonly page: unknown;
}

/** Configuration for the multi-agent browser manager. */
export interface BrowserManagerConfig {
  /** Path to Chromium executable. If not set, auto-detected. */
  readonly chromiumPath?: string;
  /** Base directory for per-agent browser profiles. */
  readonly profileBaseDir: string;
  /** Domain classification policy. */
  readonly domainPolicy: DomainPolicy;
  /** Storage provider for watermark persistence. */
  readonly storage: StorageProvider;
  /** Run headless (default true). */
  readonly headless?: boolean;
  /** Viewport dimensions. */
  readonly viewport?: { readonly width: number; readonly height: number };
  /** Extra Chromium launch arguments. */
  readonly launchArgs?: readonly string[];
  /** Whether credential autofill is enabled. Defaults to false. */
  readonly credentialAutofill?: boolean;
  /** Maximum time (ms) to wait for Chrome to launch. Default: 30 000. */
  readonly launchTimeoutMs?: number;
  /** Force a specific launch strategy; auto-detected if unset. */
  readonly launchStrategy?: "direct" | "flatpak";
}

/** Multi-agent browser manager interface. */
export interface BrowserManager {
  /** Launch (or reuse) a browser for an agent, checking watermark access. */
  launch(
    agentId: string,
    sessionTaint: ClassificationLevel,
  ): Promise<Result<BrowserInstance, string>>;
  /** Close the browser for a specific agent. */
  close(agentId: string): Promise<void>;
  /** Check whether an agent currently has a running browser. */
  isRunning(agentId: string): boolean;
  /** Read the stored profile watermark for an agent (returns a Promise). */
  getProfileWatermark(agentId: string): Promise<ClassificationLevel | null>;
  /** The domain security policy. */
  readonly domainPolicy: DomainPolicy;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** How Chrome was detected and should be launched. */
interface ChromeDetection {
  readonly kind: "direct" | "flatpak";
  /** Executable path (direct) or Flatpak app ID (flatpak). */
  readonly target: string;
  /** Path to the flatpak binary, e.g. "/usr/bin/flatpak". */
  readonly flatpakBin?: string;
}

/** Shape of the CDP `/json/version` response. */
interface CdpVersionResponse {
  readonly webSocketDebuggerUrl: string;
  readonly Browser: string;
}

/** Internal state for a running browser instance. */
interface RunningBrowser {
  readonly browser: Browser;
  readonly page: Page;
  readonly instance: BrowserInstance;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LAUNCH_TIMEOUT_MS = 30_000;
const CDP_POLL_INTERVAL_MS = 200;
const DEFAULT_VIEWPORT = { width: 1280, height: 900 };

/** Flatpak app IDs to check, in priority order. */
const FLATPAK_APP_IDS = [
  "com.google.Chrome",
  "com.google.ChromeDev",
  "org.chromium.Chromium",
  "com.brave.Browser",
] as const;

// ---------------------------------------------------------------------------
// Detection helpers (exported for testing)
// ---------------------------------------------------------------------------

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

/** Locate the `flatpak` binary. */
async function findFlatpakBin(): Promise<string | undefined> {
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

// ---------------------------------------------------------------------------
// Port & CDP helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Find a free TCP port by binding to port 0 on 127.0.0.1.
 */
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

// ---------------------------------------------------------------------------
// Launch strategies
// ---------------------------------------------------------------------------

/**
 * Standard Chrome launch arguments shared by both strategies.
 *
 * Includes anti-automation-detection flags that prevent Chrome from
 * advertising itself as WebDriver-controlled.
 *
 * @exported for testing
 */
export function baseChromeArgs(config: BrowserManagerConfig): string[] {
  return [
    "--no-first-run",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--disable-background-networking",
    // Remove Chrome's automation-mode advertising
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--exclude-switches=enable-automation",
    ...(config.credentialAutofill === true
      ? []
      : ["--disable-save-password-bubble"]),
    ...(config.launchArgs ?? []),
  ];
}

/**
 * Apply stealth patches to a puppeteer Page to suppress automation fingerprints.
 *
 * Patches applied on every new document (via `evaluateOnNewDocument`):
 * 1. `navigator.webdriver` → `undefined` (eliminates the #1 CDP detection signal)
 * 2. `window.chrome` → `{ runtime: {} }` if absent (matches real Chrome environment)
 *
 * Additionally, strips `"HeadlessChrome"` from the live user-agent string and
 * re-injects the cleaned UA for subsequent navigations.
 *
 * Must be called immediately after the page is obtained, before any navigation.
 *
 * @exported for testing
 */
export async function applyStealthPatches(page: Page): Promise<void> {
  // 1. Override navigator.webdriver — the #1 automation detection signal
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  // 2. Populate window.chrome so the environment looks like a real browser
  await page.evaluateOnNewDocument(() => {
    if (!("chrome" in window)) {
      Object.defineProperty(window, "chrome", {
        writable: true,
        enumerable: true,
        configurable: false,
        value: { runtime: {} },
      });
    }
  });

  // 3. Strip "HeadlessChrome" token from the navigator.userAgent string.
  //    Also re-override via evaluateOnNewDocument so navigations preserve the patch.
  const ua = await page.evaluate(() => navigator.userAgent) as string;
  const patchedUa = ua.replace(/HeadlessChrome\//g, "Chrome/");
  if (patchedUa !== ua) {
    await page.setUserAgent(patchedUa);
    await page.evaluateOnNewDocument(
      (cleanUa: string) => {
        Object.defineProperty(navigator, "userAgent", {
          get: () => cleanUa,
          configurable: true,
        });
      },
      patchedUa,
    );
  }
}

/** Launch Chrome via puppeteer.launch() for a direct binary, wrapped in a timeout. */
async function launchDirect(
  config: BrowserManagerConfig,
  execPath: string,
  profilePath: string,
  timeoutMs: number,
): Promise<Result<{ browser: Browser; page: Page }, string>> {
  try {
    const browser = await withTimeout(
      puppeteer.launch({
        executablePath: execPath,
        pipe: true,
        headless: config.headless !== false,
        userDataDir: profilePath,
        args: baseChromeArgs(config),
      }),
      timeoutMs,
      `Chrome launch timed out after ${timeoutMs}ms`,
    );

    const pages = await browser.pages();
    const page = pages[0] ?? await browser.newPage();
    return { ok: true, value: { browser, page } };
  } catch (err) {
    log.error("browser launch exception", (err as Error).message);
    return { ok: false, error: `Browser launch failed: ${(err as Error).message}` };
  }
}

/**
 * Launch Flatpak Chrome via puppeteer pipe mode.
 *
 * Writes a small shell wrapper script that exec-replaces itself with
 * `flatpak run --filesystem=<profileBaseDir> <appId> "$@"`, then passes it
 * as `executablePath` to `puppeteer.launch({ pipe: true })`.
 *
 * Pipe mode communicates over inherited file descriptors (FDs 3 & 4), which
 * work through `exec` regardless of Flatpak's network namespace configuration.
 * Puppeteer owns the full process lifecycle — no manual port allocation or
 * CDP polling required.
 */
async function launchFlatpak(
  config: BrowserManagerConfig,
  detection: ChromeDetection,
  profilePath: string,
  timeoutMs: number,
): Promise<Result<{ browser: Browser; page: Page }, string>> {
  const wrapperPath = `${config.profileBaseDir}/.flatpak-chrome-wrapper.sh`;
  const wrapperScript =
    `#!/bin/sh\nexec ${detection.flatpakBin} run --filesystem=${config.profileBaseDir} ${detection.target} "$@"\n`;

  try {
    await Deno.writeTextFile(wrapperPath, wrapperScript);
    await Deno.chmod(wrapperPath, 0o755);
  } catch (err) {
    log.error("flatpak wrapper write failed", (err as Error).message);
    return {
      ok: false,
      error: `Failed to write Flatpak wrapper script: ${(err as Error).message}`,
    };
  }

  const vp = config.viewport ?? DEFAULT_VIEWPORT;

  try {
    const browser = await withTimeout(
      puppeteer.launch({
        executablePath: wrapperPath,
        pipe: true,
        headless: config.headless !== false,
        userDataDir: profilePath,
        args: [
          "--no-sandbox",
          `--window-size=${vp.width},${vp.height}`,
          ...baseChromeArgs(config),
        ],
      }),
      timeoutMs,
      `Flatpak Chrome did not start in time after ${timeoutMs}ms`,
    );

    const pages = await browser.pages();
    const page = pages[0] ?? await browser.newPage();
    return { ok: true, value: { browser, page } };
  } catch (err) {
    log.error("flatpak chrome launch failed", (err as Error).message);
    return { ok: false, error: `Flatpak Chrome launch failed: ${(err as Error).message}` };
  }
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Create a multi-agent browser manager.
 *
 * Each agent gets an isolated Chromium profile under `profileBaseDir/<agentId>/profile/`.
 * Profile watermarks are persisted via StorageProvider and enforce escalation-only access.
 *
 * @param config - Browser manager configuration
 * @returns A BrowserManager instance
 */
export function createBrowserManager(config: BrowserManagerConfig): BrowserManager {
  const instances = new Map<string, RunningBrowser>();

  return {
    get domainPolicy(): DomainPolicy {
      return config.domainPolicy;
    },

    async launch(
      agentId: string,
      sessionTaint: ClassificationLevel,
    ): Promise<Result<BrowserInstance, string>> {
      log.debug("browser launch start", { agentId, sessionTaint });

      // Check watermark access
      const currentWatermark = await getWatermark(config.storage, agentId);
      if (
        currentWatermark !== null &&
        !canAccessProfile(currentWatermark, sessionTaint)
      ) {
        return {
          ok: false,
          error:
            `Profile watermark ${currentWatermark} exceeds session taint ${sessionTaint}`,
        };
      }

      // Escalate watermark
      const watermark = await escalateWatermark(
        config.storage,
        agentId,
        sessionTaint,
      );

      // Return existing instance if already running
      const existing = instances.get(agentId);
      if (existing) {
        return { ok: true, value: existing.instance };
      }

      // Detect Chrome
      const timeoutMs = config.launchTimeoutMs ?? DEFAULT_LAUNCH_TIMEOUT_MS;
      let detection: ChromeDetection | undefined;

      if (config.chromiumPath && config.launchStrategy !== "flatpak") {
        // Explicit path provided → treat as direct
        detection = { kind: "direct", target: config.chromiumPath };
      } else {
        detection = await detectChrome();
      }

      // Allow launchStrategy override
      if (detection && config.launchStrategy) {
        if (config.launchStrategy === "flatpak" && detection.kind === "direct") {
          // Cannot force flatpak when only a direct binary was found and no flatpak info
          // Re-detect specifically for flatpak
          const flatpakBin = await findFlatpakBin();
          if (flatpakBin) {
            detection = { kind: "flatpak", target: detection.target, flatpakBin };
          }
        }
        // "direct" override on a flatpak detection: keep target as exec path
      }

      if (!detection) {
        return {
          ok: false,
          error:
            "No Chromium executable found. Set chromiumPath in config or install Chromium/Chrome.",
        };
      }

      const profilePath = `${config.profileBaseDir}/${agentId}/profile`;

      // Ensure profile directory exists
      try {
        await Deno.mkdir(profilePath, { recursive: true });
      } catch {
        // may already exist
      }

      // Branch on launch strategy
      if (detection.kind === "flatpak") {
        const result = await launchFlatpak(config, detection, profilePath, timeoutMs);
        log.debug("flatpak launch result", { ok: result.ok, error: result.ok ? undefined : result.error });
        if (!result.ok) return result;

        const { browser, page } = result.value;

        const vp = config.viewport ?? DEFAULT_VIEWPORT;
        await page.setViewport({ width: vp.width, height: vp.height });
        await applyStealthPatches(page);

        const instance: BrowserInstance = {
          agentId,
          profilePath,
          watermark,
          page,
        };

        instances.set(agentId, { browser, page, instance });

        log.debug("browser launch success", { agentId, strategy: "flatpak", watermark });
        return { ok: true, value: instance };
      }

      // Direct launch
      const result = await launchDirect(config, detection.target, profilePath, timeoutMs);
      log.debug("direct launch result", { ok: result.ok, error: result.ok ? undefined : result.error });
      if (!result.ok) return result;

      const { browser, page } = result.value;

      const vp = config.viewport ?? DEFAULT_VIEWPORT;
      await page.setViewport({ width: vp.width, height: vp.height });
      await applyStealthPatches(page);

      const instance: BrowserInstance = {
        agentId,
        profilePath,
        watermark,
        page,
      };

      instances.set(agentId, { browser, page, instance });

      log.debug("browser launch success", { agentId, strategy: "direct", watermark });
      return { ok: true, value: instance };
    },

    async close(agentId: string): Promise<void> {
      const running = instances.get(agentId);
      if (!running) return;

      try {
        await running.browser.close();
      } catch {
        // ignore close errors
      }

      instances.delete(agentId);
    },

    isRunning(agentId: string): boolean {
      return instances.has(agentId);
    },

    getProfileWatermark(
      agentId: string,
    ): Promise<ClassificationLevel | null> {
      return getWatermark(config.storage, agentId);
    },
  };
}
