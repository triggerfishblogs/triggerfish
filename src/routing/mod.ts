/**
 * Multi-agent routing module.
 *
 * Routes channels to agents based on configurable rules and supports
 * Ed25519-signed delegation chains for multi-agent trust propagation.
 *
 * @module
 */

export {
  createAgentRouter,
  type AgentRouter,
  type AgentRouterConfig,
  type RouteRule,
} from "./router.ts";

export {
  createDelegationService,
  type DelegationCertificate,
  type DelegationChain,
  type DelegationKeypair,
  type DelegationService,
  type UnsignedCertificate,
} from "./delegation.ts";
