/**
 * Chromium lifecycle management for browser automation.
 *
 * Manages launching, connecting to, and shutting down Chromium instances
 * with isolated profiles per agent. No access to host browser cookies/sessions.
 *
 * @module
 */

import puppeteer from "puppeteer-core";
import type { Browser, Page } from "puppeteer-core";
import type { DomainPolicy } from "./domains.ts";

/** Browser instance state. */
export type BrowserState = "disconnected" | "connecting" | "connected" | "error";

/** Configuration for the browser manager. */
export interface BrowserManagerConfig {
  /** Path to Chromium executable. If not set, auto-detected. */
  readonly chromiumPath?: string;
  /** Isolated profile directory for this agent. */
  readonly profileDir: string;
  /** Domain classification policy. */
  readonly domainPolicy: DomainPolicy;
  /** Whether credential autofill is enabled. Defaults to false. */
  readonly credentialAutofill?: boolean;
  /** Maximum concurrent pages. Defaults to 5. */
  readonly maxPages?: number;
}

/** Browser manager interface for Chromium lifecycle control. */
export interface BrowserManager {
  /** Current browser state. */
  readonly state: BrowserState;
  /** Launch a new Chromium instance with isolated profile. */
  launch(): Promise<void>;
  /** Shut down the Chromium instance. */
  shutdown(): Promise<void>;
  /** Get the domain policy. */
  readonly domainPolicy: DomainPolicy;
  /** Get the active page instance (opaque — cast to Page in tools). */
  getPage(): unknown;
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
 * Create a browser manager for Chromium lifecycle control.
 *
 * Uses puppeteer-core to launch a real Chromium instance with CDP.
 * The browser runs headless with an isolated user profile.
 *
 * @param config - Browser manager configuration
 * @returns A BrowserManager instance
 */
export function createBrowserManager(config: BrowserManagerConfig): BrowserManager {
  let state: BrowserState = "disconnected";
  let browser: Browser | undefined;
  let page: Page | undefined;

  return {
    get state(): BrowserState {
      return state;
    },

    get domainPolicy(): DomainPolicy {
      return config.domainPolicy;
    },

    getPage(): unknown {
      return page;
    },

    async launch(): Promise<void> {
      if (state === "connected") return;
      state = "connecting";

      try {
        const executablePath = config.chromiumPath ?? await detectChromiumPath();
        if (!executablePath) {
          state = "error";
          throw new Error(
            "No Chromium executable found. Set chromiumPath in config or install Chromium/Chrome.",
          );
        }

        browser = await puppeteer.launch({
          executablePath,
          headless: true,
          userDataDir: config.profileDir,
          args: [
            "--no-first-run",
            "--disable-default-apps",
            "--disable-extensions",
            "--disable-sync",
            "--disable-background-networking",
            ...(config.credentialAutofill === true
              ? []
              : ["--disable-save-password-bubble"]),
          ],
        });

        const pages = await browser.pages();
        page = pages[0] ?? await browser.newPage();

        state = "connected";
      } catch (err) {
        if (state !== "error") state = "error";
        throw err;
      }
    },

    async shutdown(): Promise<void> {
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore close errors
        }
        browser = undefined;
        page = undefined;
      }
      state = "disconnected";
    },
  };
}
