/**
 * Search provider reconfiguration for the selective wizard.
 *
 * Prompts the user to choose between Brave Search, SearXNG,
 * or skipping search configuration, then collects provider-specific
 * settings (API key or instance URL).
 *
 * @module
 */

import { Input, Select } from "@cliffy/prompt";

import { readNestedConfigValue } from "./selective_config.ts";

import type { SearchProviderChoice } from "./wizard_types.ts";

// ── Provider-specific collectors ──────────────────────────────────────────────

/** Collect Brave Search API key and return its config fragment. */
async function collectBraveSearchConfig(): Promise<
  Record<string, unknown> | undefined
> {
  const apiKey = await Input.prompt({
    message: "Brave Search API key (or press Enter to keep existing)",
  });
  if (apiKey.length > 0) {
    return { search: { provider: "brave", api_key: apiKey } };
  }
  return undefined;
}

/** Collect SearXNG endpoint and return its config fragment. */
async function collectSearxngConfig(
  currentUrl: string,
): Promise<Record<string, unknown>> {
  const url = await Input.prompt({
    message: "SearXNG instance URL",
    default: currentUrl,
  });
  return { search: { provider: "searxng", endpoint: url } };
}

// ── Public entry point ────────────────────────────────────────────────────────

/** Prompt for which search provider to use and return its config or undefined. */
export async function reconfigureSearchProvider(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  console.log("");
  console.log("  Search Provider");
  console.log("");

  const currentProvider = (readNestedConfigValue(
    existingConfig,
    "web.search.provider",
  ) as string | undefined) ?? "";

  const choice = (await Select.prompt({
    message: "Which search engine should your agent use?",
    default: currentProvider || undefined,
    options: [
      {
        name: "Brave Search API (recommended, free tier available)",
        value: "brave",
      },
      { name: "SearXNG (self-hosted)", value: "searxng" },
      { name: "Skip for now", value: "skip" },
    ],
  })) as SearchProviderChoice;

  if (choice === "brave") {
    return await collectBraveSearchConfig();
  }
  if (choice === "searxng") {
    const currentUrl = (readNestedConfigValue(
      existingConfig,
      "web.search.endpoint",
    ) as string | undefined) ?? "http://localhost:8888";
    return await collectSearxngConfig(currentUrl);
  }
  return undefined;
}
