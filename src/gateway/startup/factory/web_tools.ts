/**
 * Web search and fetch infrastructure builder.
 *
 * Assembles a SearchProvider, WebFetcher, and DomainClassifier
 * from the application config's web section.
 * @module
 */

import type { TriggerFishConfig } from "../../../core/config.ts";
import type { ClassificationLevel } from "../../../core/types/classification.ts";
import {
  createBraveSearchProvider,
  createCloudSearchProvider,
  createDomainClassifier,
  createDomainPolicy,
  createRateLimitedSearchProvider,
  createWebFetcher,
} from "../../../tools/web/mod.ts";
import type {
  DomainClassifier,
  DomainSecurityConfig,
  SearchProvider,
  WebFetcher,
} from "../../../tools/web/mod.ts";

/** Result of building web tools from config. */
export interface WebToolsResult {
  readonly searchProvider: SearchProvider | undefined;
  readonly webFetcher: WebFetcher;
  readonly domainClassifier: DomainClassifier;
}

/** Build domain security config from the application YAML config. */
function buildDomainSecurityConfig(
  config: TriggerFishConfig,
): DomainSecurityConfig {
  const webConfig = config.web;
  return {
    allowlist: webConfig?.domains?.allowlist ?? [],
    denylist: webConfig?.domains?.denylist ?? [],
    classificationMap: (webConfig?.domains?.classifications ?? []).map((c) => ({
      pattern: c.pattern,
      classification: c.classification as ClassificationLevel,
    })),
  };
}

/** Build search provider from config, applying rate limiting if configured. */
function buildSearchProvider(
  config: TriggerFishConfig,
): SearchProvider | undefined {
  const searchConfig = config.web?.search;

  // Cloud search provider for Triggerfish Gateway subscribers
  if (searchConfig?.provider === "cloud") {
    const tfProvider = config.models.providers["triggerfish"];
    return createCloudSearchProvider({
      gatewayUrl: (tfProvider as unknown as Record<string, string>)
        ?.gatewayUrl,
      licenseKey: (tfProvider as unknown as Record<string, string>)
        ?.licenseKey,
    });
  }

  if (!searchConfig?.api_key) return undefined;

  const provider = createBraveSearchProvider({
    apiKey: searchConfig.api_key,
  });

  if (searchConfig.rate_limit) {
    return createRateLimitedSearchProvider(provider, searchConfig.rate_limit);
  }
  return provider;
}

/**
 * Build web search/fetch infrastructure from config.
 *
 * Returns a SearchProvider (if configured) and a WebFetcher.
 */
export function buildWebTools(config: TriggerFishConfig): WebToolsResult {
  const domainSecConfig = buildDomainSecurityConfig(config);
  const domainPolicy = createDomainPolicy(domainSecConfig);

  return {
    searchProvider: buildSearchProvider(config),
    webFetcher: createWebFetcher(domainPolicy),
    domainClassifier: createDomainClassifier(domainPolicy),
  };
}
