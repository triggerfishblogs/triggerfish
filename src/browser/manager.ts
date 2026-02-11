/**
 * Multi-agent Chromium lifecycle management for browser automation.
 *
 * Each agent gets an isolated browser profile with classification-aware
 * watermarking. A lower-tainted session cannot reuse a profile that has
 * been used at a higher classification level.
 *
 * @module
 */

import puppeteer from "puppeteer-core";
import type { Browser, Page } from "puppeteer-core";
import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import type { StorageProvider } from "../core/storage/provider.ts";
import type { DomainPolicy } from "./domains.ts";
import {
  canAccessProfile,
  escalateWatermark,
  getWatermark,
} from "./watermark.ts";

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

/** Internal state for a running browser instance. */
interface RunningBrowser {
  readonly browser: Browser;
  readonly page: Page;
  readonly instance: BrowserInstance;
}

/**
 * Detect Chromium/Chrome executable path on the current OS.
 *
 * @returns The path to a Chromium-based browser, or undefined if none found.
 */
async function detectChromiumPath(): Promise<string | undefined> {
  const linuxPaths = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
    "/usr/bin/microsoft-edge",
  ];

  const darwinPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];

  const candidates = Deno.build.os === "darwin" ? darwinPaths : linuxPaths;

  for (const p of candidates) {
    try {
      const stat = await Deno.stat(p);
      if (stat.isFile) return p;
    } catch {
      // not found, try next
    }
  }

  // Fallback: try 'which' for common browser names
  const names = ["chromium-browser", "chromium", "google-chrome"];
  for (const name of names) {
    try {
      const cmd = new Deno.Command("which", {
        args: [name],
        stdout: "piped",
        stderr: "null",
      });
      const result = await cmd.output();
      if (result.success) {
        return new TextDecoder().decode(result.stdout).trim();
      }
    } catch {
      // ignore
    }
  }

  return undefined;
}

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

      // Launch new browser
      try {
        const executablePath = config.chromiumPath ??
          await detectChromiumPath();
        if (!executablePath) {
          return {
            ok: false,
            error:
              "No Chromium executable found. Set chromiumPath in config or install Chromium/Chrome.",
          };
        }

        const profilePath = `${config.profileBaseDir}/${agentId}/profile`;

        const browser = await puppeteer.launch({
          executablePath,
          headless: config.headless !== false,
          userDataDir: profilePath,
          args: [
            "--no-first-run",
            "--disable-default-apps",
            "--disable-extensions",
            "--disable-sync",
            "--disable-background-networking",
            ...(config.credentialAutofill === true
              ? []
              : ["--disable-save-password-bubble"]),
            ...(config.launchArgs ?? []),
          ],
        });

        const pages = await browser.pages();
        const page = pages[0] ?? await browser.newPage();

        if (config.viewport) {
          await page.setViewport({
            width: config.viewport.width,
            height: config.viewport.height,
          });
        }

        const instance: BrowserInstance = {
          agentId,
          profilePath,
          watermark,
          page,
        };

        instances.set(agentId, { browser, page, instance });

        return { ok: true, value: instance };
      } catch (err) {
        return {
          ok: false,
          error: `Browser launch failed: ${
            (err as Error).message
          }`,
        };
      }
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
