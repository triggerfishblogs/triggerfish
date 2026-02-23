/**
 * Web tool definitions and executor for web_search and web_fetch.
 *
 * Follows the same pattern as `src/tools/todo.ts` — provides tool
 * definitions, a system prompt section, and an executor factory.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";
import type { SearchProvider } from "./search.ts";
import type { WebFetcher } from "./fetch.ts";

// ─── Tool Definitions ───────────────────────────────────────────────────────

function buildWebSearchDef(): ToolDefinition {
  return {
    name: "web_search",
    description:
      "Search the web. Returns titles, URLs, and snippets. Use the URLs to fetch full page content with web_fetch.",
    parameters: {
      query: {
        type: "string",
        description:
          "Search query. Be specific — include relevant keywords, names, or dates for better results.",
        required: true,
      },
      max_results: {
        type: "number",
        description:
          "Maximum results to return (default: 5, max: 20). Use more for broad topics.",
        required: false,
      },
    },
  };
}

function buildWebFetchDef(): ToolDefinition {
  return {
    name: "web_fetch",
    description:
      "Fetch and extract readable content from a URL. Returns article text by default. If the result is very short or empty, retry with mode 'raw' or try a different URL.",
    parameters: {
      url: {
        type: "string",
        description:
          "The URL to fetch. Can be a webpage URL from web_search results, or a direct API endpoint (e.g. from a skill's instructions). For JSON APIs, use mode 'raw'.",
        required: true,
      },
      mode: {
        type: "string",
        description:
          "Extraction mode: 'readability' (default, article text) or 'raw' (full HTML/JSON). Use 'raw' for JSON API endpoints or if readability returns too little content.",
        required: false,
      },
    },
  };
}

/**
 * Get web tool definitions for the agent system prompt.
 */
export function getWebToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildWebSearchDef(),
    buildWebFetchDef(),
  ];
}

// ─── System Prompt ──────────────────────────────────────────────────────────

/** System prompt section explaining web tools to the LLM. */
export const WEB_TOOLS_SYSTEM_PROMPT = `## Web Access

You have access to the internet via web_search and web_fetch tools.

- Use web_search to find information, then use web_fetch to read relevant pages before answering.
- web_fetch extracts article text by default. If extraction returns very little, retry with mode "raw".
- If a fetch fails or returns an error, try a different URL from the search results rather than giving up.
- When answering with web information, cite the source URLs inline so they are visible in all channels (e.g. Telegram, Slack).
- Never narrate your intent to search or fetch — just use the tools directly.`;

// ─── Executor Helpers ───────────────────────────────────────────────────────

async function executeWebSearch(
  searchProvider: SearchProvider | undefined,
  input: Record<string, unknown>,
): Promise<string> {
  if (!searchProvider) {
    return "Web search is not configured. Set up a search provider in triggerfish.yaml.";
  }

  const query = input.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return "Error: web_search requires a non-empty 'query' argument.";
  }

  const maxResults = typeof input.max_results === "number"
    ? Math.min(Math.max(input.max_results, 1), 20)
    : 5;

  const result = await searchProvider.search(query, { maxResults });

  if (!result.ok) {
    return `Search error: ${result.error}`;
  }

  const sr = result.value;
  if (sr.results.length === 0) {
    return `No results found for "${query}".`;
  }

  const lines = sr.results.map(
    (r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`,
  );

  return `Search results for "${query}":\n\n${lines.join("\n\n")}`;
}

async function executeWebFetch(
  webFetcher: WebFetcher | undefined,
  input: Record<string, unknown>,
): Promise<string> {
  if (!webFetcher) {
    return "Web fetch is not available.";
  }

  const url = input.url;
  if (typeof url !== "string" || url.trim().length === 0) {
    return "Error: web_fetch requires a non-empty 'url' argument.";
  }

  const mode = input.mode === "raw" ? "raw" as const : "readability" as const;
  const result = await webFetcher.fetch(url, { mode });

  if (!result.ok) {
    return `Fetch error: ${result.error}`;
  }

  const fr = result.value;
  const header = fr.title
    ? `Title: ${fr.title}\nURL: ${fr.url}\nMode: ${fr.mode}\n\n`
    : `URL: ${fr.url}\nMode: ${fr.mode}\n\n`;

  return header + fr.content;
}

// ─── Executor ───────────────────────────────────────────────────────────────

/** Check skill domain restriction for web_fetch. Returns error string or null. */
function checkSkillDomainRestriction(
  url: string,
  getActiveSkillDomains: (() => readonly string[] | null) | undefined,
): string | null {
  if (!getActiveSkillDomains) return null;
  const domains = getActiveSkillDomains();
  if (!domains || domains.length === 0) return null;
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null; // Let the fetcher handle invalid URLs
  }
  const allowed = domains.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`),
  );
  if (!allowed) {
    return (
      `Domain "${hostname}" is not in this skill's declared network_domains. ` +
      `Skill may only access: ${domains.join(", ")}`
    );
  }
  return null;
}

/**
 * Create a tool executor for web tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 *
 * @param searchProvider - The search provider to use for web_search
 * @param webFetcher - The web fetcher to use for web_fetch
 * @param options - Optional extended options (e.g. skill domain restriction)
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createWebToolExecutor(
  searchProvider: SearchProvider | undefined,
  webFetcher: WebFetcher | undefined,
  options?: {
    /**
     * Returns the active skill's declared `network_domains`, or null if no
     * restriction applies. When non-null, web_fetch is restricted to those domains.
     */
    readonly getActiveSkillDomains?: () => readonly string[] | null;
  },
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "web_search":
        return executeWebSearch(searchProvider, input);
      case "web_fetch": {
        // Check skill domain restriction before fetching
        const url = input.url;
        if (typeof url === "string") {
          const domainError = checkSkillDomainRestriction(
            url,
            options?.getActiveSkillDomains,
          );
          if (domainError) return `Error: ${domainError}`;
        }
        return executeWebFetch(webFetcher, input);
      }
      default:
        return null;
    }
  };
}
