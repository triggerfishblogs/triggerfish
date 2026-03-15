/**
 * Plugin Reef registry client.
 *
 * Extends The Reef marketplace model to support plugins alongside skills.
 * Plugins are published as versioned bundles containing mod.ts and any
 * supporting files, with SHA-256 integrity verification and security
 * scanning on install.
 *
 * Uses the same catalog structure as the skill registry, served from
 * a `/plugins/` path on the Reef static site.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import { createLogger } from "../core/logger/logger.ts";
import { scanPluginDirectory } from "./scanner.ts";
import { validatePluginManifest } from "./loader.ts";

const log = createLogger("plugin-reef");

/** Default base URL for The Reef static site. */
const DEFAULT_BASE_URL = "https://reef.trigger.fish";

/** Default catalog cache TTL in milliseconds (1 hour). */
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

/** Plugin listing from the Reef catalog. */
export interface ReefPluginListing {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly classification: string;
  readonly trust: string;
  readonly tags: readonly string[];
  readonly checksum: string;
  readonly publishedAt: string;
}

/** Catalog entry for a published plugin. */
export interface ReefPluginCatalogEntry {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly classification: string;
  readonly trust: string;
  readonly tags: readonly string[];
  readonly checksum: string;
  readonly publishedAt: string;
  readonly declaredEndpoints: readonly string[];
}

/** Full plugin catalog. */
export interface ReefPluginCatalog {
  readonly entries: readonly ReefPluginCatalogEntry[];
  readonly generatedAt: string;
}

/** Options for creating a plugin Reef registry. */
export interface PluginReefOptions {
  readonly baseUrl?: string;
  readonly cacheTtlMs?: number;
  readonly fetchFn?: typeof fetch;
}

/** Plugin Reef registry interface. */
export interface PluginReefRegistry {
  /** Search for plugins by query. */
  readonly search: (query: string) => Promise<Result<readonly ReefPluginListing[], string>>;
  /** Install a plugin from The Reef to the local plugins directory. */
  readonly install: (
    name: string,
    targetDir: string,
  ) => Promise<Result<string, string>>;
  /** Check installed plugins for available updates. */
  readonly checkUpdates: (
    installed: readonly { readonly name: string; readonly version?: string }[],
  ) => Promise<Result<readonly string[], string>>;
  /** Validate and prepare a plugin for Reef publishing. */
  readonly publish: (pluginDir: string) => Promise<Result<string, string>>;
}

/** In-memory catalog cache. */
interface CatalogCache {
  catalog: ReefPluginCatalog | null;
  fetchedAt: number;
}

/** Compute SHA-256 hex digest of content. */
async function computeHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Validate a registry URL uses HTTPS and matches expected host. */
function validateRegistryUrl(
  url: string,
  baseUrl: string,
): Result<URL, string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: `Registry URL parse failed: ${url}` };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: `Registry URL must use HTTPS: ${url}` };
  }
  let expectedHost: string;
  try {
    expectedHost = new URL(baseUrl).hostname;
  } catch {
    return { ok: false, error: `Registry base URL parse failed: ${baseUrl}` };
  }
  if (parsed.hostname !== expectedHost) {
    return {
      ok: false,
      error: `Registry URL hostname mismatch: expected ${expectedHost}, got ${parsed.hostname}`,
    };
  }
  return { ok: true, value: parsed };
}

/** Compare semver versions. Returns 1 if a > b, -1 if a < b, 0 if equal. */
function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const strip = (v: string) => v.replace(/-.*$/, "");
  const pa = strip(a).split(".").map(Number);
  const pb = strip(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

/** Fetch the plugin catalog from the network or cache. */
async function fetchCatalog(
  baseUrl: string,
  cache: CatalogCache,
  cacheTtlMs: number,
  fetchFn: typeof fetch,
): Promise<Result<ReefPluginCatalog, string>> {
  if (cache.catalog && (Date.now() - cache.fetchedAt) < cacheTtlMs) {
    return { ok: true, value: cache.catalog };
  }
  const url = `${baseUrl}/plugins/index/catalog.json`;
  const urlCheck = validateRegistryUrl(url, baseUrl);
  if (!urlCheck.ok) return urlCheck;

  try {
    const response = await fetchFn(url);
    if (!response.ok) {
      if (cache.catalog) {
        log.warn("Plugin catalog fetch failed, serving stale cache", {
          operation: "fetchCatalog",
          status: response.status,
        });
        return { ok: true, value: cache.catalog };
      }
      return { ok: false, error: `Plugin catalog fetch returned ${response.status}` };
    }
    const body = await response.json();
    if (!body || !Array.isArray(body.entries)) {
      return { ok: false, error: "Plugin catalog missing entries array" };
    }
    cache.catalog = body as ReefPluginCatalog;
    cache.fetchedAt = Date.now();
    return { ok: true, value: cache.catalog };
  } catch (err) {
    if (cache.catalog) {
      return { ok: true, value: cache.catalog };
    }
    return { ok: false, error: `Plugin catalog fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Find the latest version of a plugin in the catalog. */
function findLatestEntry(
  catalog: ReefPluginCatalog,
  name: string,
): ReefPluginCatalogEntry | null {
  const matches = catalog.entries.filter(
    (e) => e.name.toLowerCase() === name.toLowerCase(),
  );
  if (matches.length === 0) return null;
  return matches.reduce((latest, entry) =>
    compareSemver(entry.version, latest.version) > 0 ? entry : latest
  );
}

/** Install a plugin bundle from The Reef. */
async function installPlugin(
  entry: ReefPluginCatalogEntry,
  targetDir: string,
  baseUrl: string,
  fetchFn: typeof fetch,
): Promise<Result<string, string>> {
  const modUrl = `${baseUrl}/plugins/${entry.name}/${entry.version}/mod.ts`;
  const urlCheck = validateRegistryUrl(modUrl, baseUrl);
  if (!urlCheck.ok) return urlCheck;

  let modContent: string;
  try {
    const response = await fetchFn(modUrl);
    if (!response.ok) {
      return { ok: false, error: `Plugin fetch failed: ${modUrl} returned ${response.status}` };
    }
    modContent = await response.text();
  } catch (err) {
    return { ok: false, error: `Plugin fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Verify checksum
  const actualHash = await computeHash(modContent);
  if (actualHash !== entry.checksum) {
    log.warn("Plugin install checksum mismatch", {
      operation: "installPlugin",
      plugin: entry.name,
      expected: entry.checksum,
      actual: actualHash,
    });
    return { ok: false, error: `Checksum mismatch for plugin "${entry.name}"` };
  }

  // Write to target directory
  const pluginDir = `${targetDir}/${entry.name}`;
  try {
    await Deno.mkdir(pluginDir, { recursive: true });
    await Deno.writeTextFile(`${pluginDir}/mod.ts`, modContent);
  } catch (err) {
    return { ok: false, error: `Plugin write failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Security scan the installed plugin
  const scanResult = await scanPluginDirectory(pluginDir);
  if (!scanResult.ok) {
    // Remove the plugin if it fails scanning
    try {
      await Deno.remove(pluginDir, { recursive: true });
    } catch { /* cleanup best effort */ }
    log.warn("Plugin install rejected by security scanner", {
      operation: "installPlugin",
      plugin: entry.name,
      warnings: scanResult.warnings,
    });
    return {
      ok: false,
      error: `Plugin "${entry.name}" failed security scan: ${scanResult.warnings.join("; ")}`,
    };
  }

  // Record integrity hash
  const hashRecord = {
    pluginName: entry.name,
    contentHash: actualHash,
    recordedAt: new Date().toISOString(),
    source: "reef" as const,
    version: entry.version,
  };
  await Deno.writeTextFile(
    `${pluginDir}/.plugin-hash.json`,
    JSON.stringify(hashRecord, null, 2),
  );

  log.info("Plugin installed from The Reef", {
    operation: "installPlugin",
    plugin: entry.name,
    version: entry.version,
  });
  return { ok: true, value: `Installed ${entry.name}@${entry.version}` };
}

/** Validate and prepare a plugin for Reef publishing. */
async function publishPlugin(
  pluginDir: string,
): Promise<Result<string, string>> {
  // Read and validate mod.ts
  let modContent: string;
  try {
    modContent = await Deno.readTextFile(`${pluginDir}/mod.ts`);
  } catch {
    return { ok: false, error: `No mod.ts found in ${pluginDir}` };
  }

  // Dynamic import to validate exports
  let mod: Record<string, unknown>;
  try {
    mod = await import(`${pluginDir}/mod.ts`);
  } catch (err) {
    return { ok: false, error: `Plugin import failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Validate manifest
  const manifestResult = validatePluginManifest(mod.manifest);
  if (!manifestResult.ok) {
    return { ok: false, error: manifestResult.error };
  }

  // Validate required exports
  if (!Array.isArray(mod.toolDefinitions)) {
    return { ok: false, error: "Plugin missing toolDefinitions export" };
  }
  if (typeof mod.createExecutor !== "function") {
    return { ok: false, error: "Plugin missing createExecutor export" };
  }

  // Security scan
  const scanResult = await scanPluginDirectory(pluginDir);
  if (!scanResult.ok) {
    return {
      ok: false,
      error: `Plugin failed security scan: ${scanResult.warnings.join("; ")}`,
    };
  }

  // Generate publish directory structure
  const manifest = manifestResult.value;
  const checksum = await computeHash(modContent);
  const tempDir = await Deno.makeTempDir({ prefix: "reef-plugin-publish-" });
  const publishDir = `${tempDir}/plugins/${manifest.name}/${manifest.version}`;
  await Deno.mkdir(publishDir, { recursive: true });
  await Deno.writeTextFile(`${publishDir}/mod.ts`, modContent);

  const metadata = {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    classification: manifest.classification,
    trust: manifest.trust,
    declaredEndpoints: manifest.declaredEndpoints,
    checksum,
    publishedAt: new Date().toISOString(),
    author: "unknown", // Would be set by the publishing user
    tags: [],
  };
  await Deno.writeTextFile(
    `${publishDir}/metadata.json`,
    JSON.stringify(metadata, null, 2),
  );

  log.info("Plugin prepared for Reef publishing", {
    operation: "publishPlugin",
    plugin: manifest.name,
    version: manifest.version,
    outputDir: tempDir,
  });

  return { ok: true, value: tempDir };
}

/**
 * Create a plugin Reef registry client.
 *
 * Connects to The Reef static site for plugin discovery, installation,
 * update checking, and publishing. Mirrors the skill registry pattern.
 */
export function createPluginReefRegistry(
  options?: PluginReefOptions,
): PluginReefRegistry {
  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  const cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const fetchFn = options?.fetchFn ?? globalThis.fetch;
  const cache: CatalogCache = { catalog: null, fetchedAt: 0 };

  return {
    async search(query: string): Promise<Result<readonly ReefPluginListing[], string>> {
      const catalogResult = await fetchCatalog(baseUrl, cache, cacheTtlMs, fetchFn);
      if (!catalogResult.ok) return catalogResult;

      const lower = query.toLowerCase();
      const results = catalogResult.value.entries
        .filter((e) =>
          e.name.toLowerCase().includes(lower) ||
          e.description.toLowerCase().includes(lower) ||
          e.tags.some((t) => t.toLowerCase().includes(lower))
        )
        .slice(0, 20)
        .map((e): ReefPluginListing => ({
          name: e.name,
          version: e.version,
          description: e.description,
          author: e.author,
          classification: e.classification,
          trust: e.trust,
          tags: e.tags,
          checksum: e.checksum,
          publishedAt: e.publishedAt,
        }));
      return { ok: true, value: results };
    },

    async install(name: string, targetDir: string): Promise<Result<string, string>> {
      const catalogResult = await fetchCatalog(baseUrl, cache, cacheTtlMs, fetchFn);
      if (!catalogResult.ok) return catalogResult;

      const entry = findLatestEntry(catalogResult.value, name);
      if (!entry) {
        return { ok: false, error: `Plugin "${name}" not found in The Reef` };
      }
      return installPlugin(entry, targetDir, baseUrl, fetchFn);
    },

    async checkUpdates(
      installed: readonly { readonly name: string; readonly version?: string }[],
    ): Promise<Result<readonly string[], string>> {
      const catalogResult = await fetchCatalog(baseUrl, cache, cacheTtlMs, fetchFn);
      if (!catalogResult.ok) return catalogResult;

      const updatable: string[] = [];
      for (const plugin of installed) {
        const entry = findLatestEntry(catalogResult.value, plugin.name);
        if (!entry) continue;
        if (compareSemver(entry.version, plugin.version ?? "0.0.0") > 0) {
          updatable.push(plugin.name);
        }
      }
      return { ok: true, value: updatable };
    },

    publish: publishPlugin,
  };
}
