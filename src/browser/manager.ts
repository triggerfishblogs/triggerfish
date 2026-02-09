/**
 * Chromium lifecycle management for browser automation.
 *
 * Manages launching, connecting to, and shutting down Chromium instances
 * with isolated profiles per agent. No access to host browser cookies/sessions.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
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
}

/**
 * Create a browser manager for Chromium lifecycle control.
 *
 * @param config - Browser manager configuration
 * @returns A BrowserManager instance
 */
export function createBrowserManager(config: BrowserManagerConfig): BrowserManager {
  let state: BrowserState = "disconnected";

  return {
    get state(): BrowserState {
      return state;
    },

    get domainPolicy(): DomainPolicy {
      return config.domainPolicy;
    },

    async launch(): Promise<void> {
      state = "connecting";
      // CDP connection will be implemented when puppeteer-core or playwright is integrated.
      // For now, the manager tracks state and provides the domain policy.
      state = "connected";
    },

    async shutdown(): Promise<void> {
      state = "disconnected";
    },
  };
}
