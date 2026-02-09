/**
 * Channel-to-agent routing.
 *
 * Routes incoming channel messages to the correct agent based on
 * configurable routing rules with a default fallback.
 *
 * @module
 */

/** A single routing rule mapping a channel to an agent. */
export interface RouteRule {
  readonly channel: string;
  readonly agentId: string;
}

/** Configuration for the agent router. */
export interface AgentRouterConfig {
  readonly routes: readonly RouteRule[];
  readonly defaultAgent: string;
}

/** Router that resolves a channel identifier to an agent ID. */
export interface AgentRouter {
  /** Resolve which agent should handle messages for the given channel. */
  route(channel: string): string;
}

/**
 * Create a channel-to-agent router.
 *
 * Looks up the channel in the configured routes. If no matching route
 * is found, returns the default agent.
 *
 * @param config - Routing rules and default agent
 * @returns An AgentRouter instance
 */
export function createAgentRouter(config: AgentRouterConfig): AgentRouter {
  const routeMap = new Map<string, string>();
  for (const rule of config.routes) {
    routeMap.set(rule.channel, rule.agentId);
  }

  return {
    route(channel: string): string {
      return routeMap.get(channel) ?? config.defaultAgent;
    },
  };
}
