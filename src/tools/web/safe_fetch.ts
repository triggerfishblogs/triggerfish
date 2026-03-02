/**
 * safeFetch — re-exports from core/security/safe_fetch.ts.
 *
 * The canonical implementation lives in `src/core/security/safe_fetch.ts` so
 * that all layers (CLI, channels, MCP, plugins) can use SSRF-checked HTTP
 * without crossing dependency boundaries. This module re-exports for
 * backward compatibility within the tools/web barrel.
 *
 * @module
 */

export { safeFetch, type SsrfChecker } from "../../core/security/safe_fetch.ts";
