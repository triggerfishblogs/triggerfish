/**
 * Browser automation module for Chromium CDP control.
 *
 * Provides domain classification policy, browser lifecycle management,
 * and page interaction tools with security enforcement.
 *
 * @module
 */

export {
  createDomainPolicy,
  type DomainPolicy,
  type DomainPolicyConfig,
} from "./domains.ts";

export {
  createBrowserManager,
  type BrowserManager,
  type BrowserManagerConfig,
  type BrowserState,
} from "./manager.ts";

export {
  createBrowserTools,
  type BrowserToolResult,
  type BrowserTools,
} from "./tools.ts";
