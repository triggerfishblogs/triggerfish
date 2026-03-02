/**
 * SSRF prevention — re-exports from core/security/ssrf.ts.
 *
 * The canonical implementation lives in `src/core/security/ssrf.ts` so that
 * all layers (CLI, channels, MCP, plugins) can use SSRF-checked HTTP
 * without crossing dependency boundaries. This module re-exports for
 * backward compatibility within the tools/web barrel.
 *
 * @module
 */

export {
  checkIpListForSsrf,
  isPrivateIp,
  resolveAndCheck,
} from "../../core/security/ssrf.ts";
