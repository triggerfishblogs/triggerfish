/**
 * The Reef registry client.
 *
 * Fetches static JSON files from GitHub Pages for skill discovery,
 * installation, and update checking. Publishing generates a local
 * directory structure for PR submission to the reef-registry repo.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../../core/types/classification.ts";
import { parseClassification } from "../../core/types/classification.ts";
import type {
  ReefRegistry,
  ReefSearchOptions,
  ReefSkillListing,
} from "../../core/types/skills.ts";
import { createLogger } from "../../core/logger/logger.ts";
import { createSkillScanner } from "./scanner.ts";
import { computeSkillHash, recordSkillHash } from "./integrity.ts";
import { parse as parseYaml } from "@std/yaml";
import { join } from "@std/path";

const log = createLogger("reef-registry");

/** Default base URL for The Reef static site (GitHub Pages). */
const DEFAULT_BASE_URL = "https://greghavens.github.io/reef-registry";

/** Default catalog cache TTL in milliseconds (1 hour). */
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

// Re-export shared types from core so existing importers continue to work.
export type { ReefRegistry, ReefSearchOptions, ReefSkillListing } from "../../core/types/skills.ts";

/** Options for creating a Reef registry client. */
export interface ReefRegistryOptions {
  /** Base URL for The Reef static site. */
  readonly baseUrl?: string;
  /** Catalog cache TTL in milliseconds (default: 1 hour). */
  readonly cacheTtlMs?: number;
  /** Override fetch for testing. Defaults to globalThis.fetch. */
  readonly fetchFn?: typeof fetch;
}

/** Entry in the Reef catalog index (/index/catalog.json). */
export interface ReefCatalogEntry {
  /** Skill name. */
  readonly name: string;
  /** Skill version (semver). */
  readonly version: string;
  /** Skill description. */
  readonly description: string;
  /** Author identifier. */
  readonly author: string;
  /** Tags for categorization. */
  readonly tags: readonly string[];
  /** Category. */
  readonly category: string;
  /** Classification ceiling as string. */
  readonly classificationCeiling: string;
  /** SHA-256 hex digest of SKILL.md content. */
  readonly checksum: string;
  /** ISO 8601 publish timestamp. */
  readonly publishedAt: string;
}

/** Full catalog structure served at /index/catalog.json. */
export interface ReefCatalog {
  /** All skill entries in the catalog. */
  readonly entries: readonly ReefCatalogEntry[];
  /** ISO 8601 timestamp when the catalog was generated. */
  readonly generatedAt: string;
}

/** Metadata file served at /skills/{name}/{version}/metadata.json. */
export interface ReefSkillMetadata {
  /** Skill name. */
  readonly name: string;
  /** Skill version (semver). */
  readonly version: string;
  /** Skill description. */
  readonly description: string;
  /** Author identifier. */
  readonly author: string;
  /** Tags for categorization. */
  readonly tags: readonly string[];
  /** Category. */
  readonly category: string;
  /** Classification ceiling as string. */
  readonly classificationCeiling: string;
  /** SHA-256 hex digest of SKILL.md content. */
  readonly checksum: string;
  /** ISO 8601 publish timestamp. */
  readonly publishedAt: string;
  /** Tools required by this skill (null = unrestricted). */
  readonly requiresTools: readonly string[] | null;
  /** Network domains this skill needs (null = unrestricted). */
  readonly networkDomains: readonly string[] | null;
}

// ─── Internal types ──────────────────────────────────────────────────────────

/**
 * In-memory catalog cache with TTL tracking.
 *
 * Mutable: intentionally shared state for cache invalidation across
 * registry operations. The cache object is passed by reference as a
 * deliberate shared-state optimization so that search, install, and
 * checkUpdates calls within the same registry instance share one
 * cached catalog without redundant network fetches.
 */
interface CatalogCache {
  catalog: ReefCatalog | null;
  fetchedAt: number;
}

// ─── Input validation ─────────────────────────────────────────────────────────

/** Pattern for valid skill names: lowercase alphanumeric, may contain hyphens, must start with alphanum. */
const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Pattern for valid semver versions: major.minor.patch with optional pre-release suffix. */
const SEMVER_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

/**
 * Validate a skill name is safe for use in filesystem paths and URLs.
 *
 * Rejects names containing path traversal sequences, slashes, dots,
 * or other characters that could escape the intended directory.
 */
function validateSkillName(name: string): Result<string, string> {
  if (!SKILL_NAME_PATTERN.test(name)) {
    return {
      ok: false,
      error: `Skill name contains invalid characters: "${name}" (must match ${SKILL_NAME_PATTERN})`,
    };
  }
  return { ok: true, value: name };
}

/**
 * Validate a version string is safe for use in filesystem paths and URLs.
 *
 * Rejects versions containing path traversal sequences or characters
 * outside of the semver specification.
 */
function validateSkillVersion(version: string): Result<string, string> {
  if (!SEMVER_VERSION_PATTERN.test(version)) {
    return {
      ok: false,
      error: `Skill version contains invalid characters: "${version}" (must match ${SEMVER_VERSION_PATTERN})`,
    };
  }
  return { ok: true, value: version };
}

// ─── Semver comparison ───────────────────────────────────────────────────────

/**
 * Compare two semver version strings.
 *
 * @returns 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const stripPre = (v: string) => v.replace(/-.*$/, "");
  const partsA = stripPre(a).split(".").map(Number);
  const partsB = stripPre(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const va = partsA[i] ?? 0;
    const vb = partsB[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

// ─── Catalog fetching ────────────────────────────────────────────────────────

/**
 * Validate that a registry URL uses HTTPS and matches the expected host.
 *
 * SSRF note: The baseUrl is hardcoded to DEFAULT_BASE_URL by default and only
 * overridable via ReefRegistryOptions (code-level, not user input). The fetchFn
 * is also injected at construction time. This validation adds defense-in-depth
 * to ensure that even if baseUrl is misconfigured, only HTTPS requests to known
 * hosts are permitted.
 */
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
    return {
      ok: false,
      error: `Registry URL must use HTTPS, got ${parsed.protocol} for ${url}`,
    };
  }
  let expectedHost: string;
  try {
    expectedHost = new URL(baseUrl).hostname;
  } catch {
    return {
      ok: false,
      error: `Registry base URL parse failed: ${baseUrl}`,
    };
  }
  if (parsed.hostname !== expectedHost) {
    return {
      ok: false,
      error: `Registry URL hostname mismatch: expected ${expectedHost}, got ${parsed.hostname}`,
    };
  }
  return { ok: true, value: parsed };
}

/** Check whether the catalog cache is still valid. */
function isCacheValid(cache: CatalogCache, cacheTtlMs: number): boolean {
  return cache.catalog !== null && (Date.now() - cache.fetchedAt) < cacheTtlMs;
}

/** Fetch catalog JSON from the network. */
async function fetchCatalogFromNetwork(
  baseUrl: string,
  fetchFn: typeof fetch,
): Promise<Result<ReefCatalog, string>> {
  const catalogUrl = `${baseUrl}/index/catalog.json`;
  const urlCheck = validateRegistryUrl(catalogUrl, baseUrl);
  if (!urlCheck.ok) return urlCheck;

  const response = await fetchFn(catalogUrl);
  if (!response.ok) {
    return {
      ok: false,
      error: `Catalog fetch returned status ${response.status}`,
    };
  }
  const body = await response.json();
  if (!body || !Array.isArray(body.entries)) {
    return {
      ok: false,
      error: "Catalog response missing entries array",
    };
  }
  return { ok: true, value: body as ReefCatalog };
}

/** Return stale cached catalog or an error if no cache exists. */
function serveStaleCacheOrError(
  cache: CatalogCache,
  errorMessage: string,
  originalError?: unknown,
): Result<ReefCatalog, string> {
  if (cache.catalog) {
    log.warn("Catalog fetch failed, serving stale cache", {
      operation: "fetchCatalog",
      err: originalError ?? errorMessage,
    });
    return { ok: true, value: cache.catalog };
  }
  log.warn("Catalog fetch failed with no stale cache available", {
    operation: "fetchCatalog",
    err: originalError ?? errorMessage,
  });
  return { ok: false, error: errorMessage };
}

/** Fetch the catalog, using cache when valid and falling back to stale cache on error. */
async function fetchCatalog(options: {
  readonly baseUrl: string;
  readonly cache: CatalogCache;
  readonly cacheTtlMs: number;
  readonly fetchFn: typeof fetch;
}): Promise<Result<ReefCatalog, string>> {
  if (isCacheValid(options.cache, options.cacheTtlMs)) {
    return { ok: true, value: options.cache.catalog! };
  }
  try {
    const result = await fetchCatalogFromNetwork(
      options.baseUrl,
      options.fetchFn,
    );
    if (result.ok) {
      options.cache.catalog = result.value;
      options.cache.fetchedAt = Date.now();
      return result;
    }
    return serveStaleCacheOrError(options.cache, result.error);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return serveStaleCacheOrError(
      options.cache,
      `Catalog fetch failed: ${message}`,
      err,
    );
  }
}

// ─── Search helpers ──────────────────────────────────────────────────────────

/** Check whether a catalog entry matches a search query. */
function matchesCatalogQuery(
  entry: ReefCatalogEntry,
  query: string,
): boolean {
  const lower = query.toLowerCase();
  return (
    entry.name.toLowerCase().includes(lower) ||
    entry.tags.some((t) => t.toLowerCase().includes(lower)) ||
    entry.category.toLowerCase().includes(lower) ||
    entry.description.toLowerCase().includes(lower)
  );
}

/** Convert a catalog entry to a public skill listing. */
function catalogEntryToListing(entry: ReefCatalogEntry): ReefSkillListing {
  const classResult = parseClassification(entry.classificationCeiling);
  const ceiling: ClassificationLevel = classResult.ok
    ? classResult.value
    : "PUBLIC";
  return {
    name: entry.name,
    description: entry.description,
    version: entry.version,
    author: entry.author,
    tags: entry.tags,
    category: entry.category,
    downloads: 0,
    classificationCeiling: ceiling,
    checksum: entry.checksum,
    publishedAt: entry.publishedAt,
  };
}

// ─── Catalog lookup ──────────────────────────────────────────────────────────

/** Find the latest version of a skill in the catalog by name. */
function findLatestSkillEntry(
  catalog: ReefCatalog,
  name: string,
): ReefCatalogEntry | null {
  const matches = catalog.entries.filter(
    (e) => e.name.toLowerCase() === name.toLowerCase(),
  );
  if (matches.length === 0) return null;
  return matches.reduce((latest, entry) =>
    compareSemver(entry.version, latest.version) > 0 ? entry : latest
  );
}

// ─── Install helpers ─────────────────────────────────────────────────────────

/** Fetch a skill's SKILL.md content from the registry. */
async function fetchSkillContent(options: {
  readonly baseUrl: string;
  readonly name: string;
  readonly version: string;
  readonly fetchFn: typeof fetch;
}): Promise<Result<string, string>> {
  const nameCheck = validateSkillName(options.name);
  if (!nameCheck.ok) return nameCheck;
  const versionCheck = validateSkillVersion(options.version);
  if (!versionCheck.ok) return versionCheck;

  const url =
    `${options.baseUrl}/skills/${options.name}/${options.version}/SKILL.md`;
  const urlCheck = validateRegistryUrl(url, options.baseUrl);
  if (!urlCheck.ok) return urlCheck;

  try {
    const response = await options.fetchFn(url);
    if (!response.ok) {
      return {
        ok: false,
        error: `Skill fetch failed: ${url} returned ${response.status}`,
      };
    }
    return { ok: true, value: await response.text() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Skill fetch failed: ${message}` };
  }
}

/** Verify SHA-256 checksum of downloaded content against expected value. */
async function verifyDownloadChecksum(
  content: string,
  expectedChecksum: string,
): Promise<Result<void, string>> {
  const actual = await computeSkillHash(content);
  if (actual !== expectedChecksum) {
    return {
      ok: false,
      error:
        `Checksum mismatch: expected ${expectedChecksum}, got ${actual}`,
    };
  }
  return { ok: true, value: undefined };
}

/** Write a downloaded skill's SKILL.md to the target directory. */
async function writeInstalledSkill(
  targetDir: string,
  name: string,
  content: string,
): Promise<Result<void, string>> {
  const nameCheck = validateSkillName(name);
  if (!nameCheck.ok) return nameCheck;

  const skillDir = join(targetDir, name);
  try {
    await Deno.mkdir(skillDir, { recursive: true });
    await Deno.writeTextFile(join(skillDir, "SKILL.md"), content);
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Skill write failed: ${message}` };
  }
}

/** Scan content with the security scanner and write to disk if clean. */
async function scanAndWriteSkill(options: {
  readonly content: string;
  readonly entry: ReefCatalogEntry;
  readonly targetDir: string;
}): Promise<Result<string, string>> {
  const scanner = createSkillScanner();
  const scanResult = await scanner.scan(options.content);
  if (!scanResult.ok) {
    log.warn("Skill install rejected by scanner", {
      operation: "installSkill",
      skillName: options.entry.name,
      warnings: scanResult.warnings,
    });
    return {
      ok: false,
      error: `Skill "${options.entry.name}" failed security scan: ${
        scanResult.warnings.join("; ")
      }`,
    };
  }

  const writeResult = await writeInstalledSkill(
    options.targetDir,
    options.entry.name,
    options.content,
  );
  if (!writeResult.ok) return writeResult;

  const contentHash = await computeSkillHash(options.content);
  await recordSkillHash(
    join(options.targetDir, options.entry.name),
    options.entry.name,
    contentHash,
    "reef",
  );

  log.debug("Skill installed from The Reef", {
    operation: "installSkill",
    skillName: options.entry.name,
    version: options.entry.version,
  });

  return {
    ok: true,
    value: `Installed ${options.entry.name}@${options.entry.version}`,
  };
}

/** Fetch, verify, scan, and install a skill from a catalog entry. */
async function installSkillFromEntry(options: {
  readonly entry: ReefCatalogEntry;
  readonly targetDir: string;
  readonly baseUrl: string;
  readonly fetchFn: typeof fetch;
}): Promise<Result<string, string>> {
  const contentResult = await fetchSkillContent({
    baseUrl: options.baseUrl,
    name: options.entry.name,
    version: options.entry.version,
    fetchFn: options.fetchFn,
  });
  if (!contentResult.ok) return contentResult;

  const checksumResult = await verifyDownloadChecksum(
    contentResult.value,
    options.entry.checksum,
  );
  if (!checksumResult.ok) {
    log.warn("Skill install checksum verification failed", {
      operation: "installSkill",
      skillName: options.entry.name,
      err: checksumResult.error,
    });
    return checksumResult;
  }

  return scanAndWriteSkill({
    content: contentResult.value,
    entry: options.entry,
    targetDir: options.targetDir,
  });
}

// ─── Publish helpers ─────────────────────────────────────────────────────────

/** Parsed frontmatter fields required for Reef publishing. */
interface ParsedPublishFrontmatter {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly tags: readonly string[];
  readonly category: string;
  readonly classificationCeiling: string;
  readonly requiresTools: readonly string[] | null;
  readonly networkDomains: readonly string[] | null;
}

/** Fields that must be present in SKILL.md frontmatter for publishing. */
const REQUIRED_PUBLISH_FIELDS = [
  "name",
  "version",
  "description",
  "author",
  "tags",
  "category",
  "classification_ceiling",
] as const;

/** Extract YAML frontmatter from SKILL.md content. */
function extractYamlFrontmatter(
  content: string,
): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)(?:\n---|\n\.\.\.)/);
  if (!match) return null;
  try {
    return parseYaml(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Validate that all required Reef fields are present in frontmatter. */
function validatePublishFrontmatter(
  raw: Record<string, unknown>,
): Result<ParsedPublishFrontmatter, string> {
  const missing = REQUIRED_PUBLISH_FIELDS.filter((f) => !raw[f]);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required frontmatter fields: ${missing.join(", ")}`,
    };
  }
  const nameCheck = validateSkillName(String(raw.name));
  if (!nameCheck.ok) return nameCheck;
  const versionCheck = validateSkillVersion(String(raw.version));
  if (!versionCheck.ok) return versionCheck;
  const classResult = parseClassification(
    String(raw.classification_ceiling),
  );
  if (!classResult.ok) {
    return {
      ok: false,
      error: `Invalid classification_ceiling: ${raw.classification_ceiling}`,
    };
  }
  const tags = Array.isArray(raw.tags) ? (raw.tags as string[]) : [];
  return {
    ok: true,
    value: {
      name: String(raw.name),
      version: String(raw.version),
      description: String(raw.description),
      author: String(raw.author),
      tags,
      category: String(raw.category),
      classificationCeiling: String(raw.classification_ceiling),
      requiresTools: Array.isArray(raw.requires_tools)
        ? (raw.requires_tools as string[])
        : null,
      networkDomains: Array.isArray(raw.network_domains)
        ? (raw.network_domains as string[])
        : null,
    },
  };
}

/** Build metadata from validated frontmatter and computed checksum. */
function buildSkillMetadata(
  frontmatter: ParsedPublishFrontmatter,
  checksum: string,
): ReefSkillMetadata {
  return {
    name: frontmatter.name,
    version: frontmatter.version,
    description: frontmatter.description,
    author: frontmatter.author,
    tags: frontmatter.tags,
    category: frontmatter.category,
    classificationCeiling: frontmatter.classificationCeiling,
    checksum,
    publishedAt: new Date().toISOString(),
    requiresTools: frontmatter.requiresTools,
    networkDomains: frontmatter.networkDomains,
  };
}

/** Create the publish directory structure in a temp directory. */
async function writePublishDirectory(
  metadata: ReefSkillMetadata,
  skillContent: string,
): Promise<Result<string, string>> {
  const tempDir = await Deno.makeTempDir({ prefix: "reef-publish-" });
  const skillDir = join(
    tempDir,
    "skills",
    metadata.name,
    metadata.version,
  );
  try {
    await Deno.mkdir(skillDir, { recursive: true });
    await Deno.writeTextFile(join(skillDir, "SKILL.md"), skillContent);
    await Deno.writeTextFile(
      join(skillDir, "metadata.json"),
      JSON.stringify(metadata, null, 2),
    );
    return { ok: true, value: tempDir };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Publish directory creation failed: ${message}`,
    };
  }
}

// ─── Method implementations ──────────────────────────────────────────────────

/** Execute a catalog search with client-side filtering. */
async function executeSearch(options: {
  readonly searchOptions: ReefSearchOptions;
  readonly baseUrl: string;
  readonly cache: CatalogCache;
  readonly cacheTtlMs: number;
  readonly fetchFn: typeof fetch;
}): Promise<Result<readonly ReefSkillListing[], string>> {
  const catalogResult = await fetchCatalog(options);
  if (!catalogResult.ok) return catalogResult;

  const limit = options.searchOptions.limit ?? 20;
  const results = catalogResult.value.entries
    .filter((e) => matchesCatalogQuery(e, options.searchOptions.query))
    .slice(0, limit)
    .map(catalogEntryToListing);
  return { ok: true, value: results };
}

/** Look up a skill in the catalog and install it. */
async function executeInstall(options: {
  readonly name: string;
  readonly targetDir: string;
  readonly baseUrl: string;
  readonly cache: CatalogCache;
  readonly cacheTtlMs: number;
  readonly fetchFn: typeof fetch;
}): Promise<Result<string, string>> {
  const catalogResult = await fetchCatalog(options);
  if (!catalogResult.ok) return catalogResult;

  const entry = findLatestSkillEntry(catalogResult.value, options.name);
  if (!entry) {
    return {
      ok: false,
      error: `Skill "${options.name}" not found in The Reef`,
    };
  }

  return installSkillFromEntry({
    entry,
    targetDir: options.targetDir,
    baseUrl: options.baseUrl,
    fetchFn: options.fetchFn,
  });
}

/** Check installed skills against the catalog for available updates. */
async function executeCheckUpdates(options: {
  readonly installedSkills: readonly {
    readonly name: string;
    readonly version?: string;
  }[];
  readonly baseUrl: string;
  readonly cache: CatalogCache;
  readonly cacheTtlMs: number;
  readonly fetchFn: typeof fetch;
}): Promise<Result<readonly string[], string>> {
  const catalogResult = await fetchCatalog(options);
  if (!catalogResult.ok) return catalogResult;

  const updatable: string[] = [];
  for (const installed of options.installedSkills) {
    const entry = findLatestSkillEntry(catalogResult.value, installed.name);
    if (!entry) continue;
    const installedVersion = installed.version ?? "0.0.0";
    if (compareSemver(entry.version, installedVersion) > 0) {
      updatable.push(installed.name);
    }
  }

  return { ok: true, value: updatable };
}

/** Validate a local skill and generate the directory structure for a Reef PR. */
async function executePublish(
  skillPath: string,
): Promise<Result<string, string>> {
  let content: string;
  try {
    content = await Deno.readTextFile(skillPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read SKILL.md: ${message}` };
  }

  const raw = extractYamlFrontmatter(content);
  if (!raw) {
    return {
      ok: false,
      error:
        "SKILL.md missing YAML frontmatter (must start with ---)",
    };
  }

  const frontmatterResult = validatePublishFrontmatter(raw);
  if (!frontmatterResult.ok) return frontmatterResult;

  const scanner = createSkillScanner();
  const scanResult = await scanner.scan(content);
  if (!scanResult.ok) {
    log.warn("Skill publish rejected by security scanner", {
      operation: "executePublish",
      skillPath,
      warnings: scanResult.warnings,
    });
    return {
      ok: false,
      error: `Skill failed security scan: ${scanResult.warnings.join("; ")}`,
    };
  }

  const checksum = await computeSkillHash(content);
  const metadata = buildSkillMetadata(frontmatterResult.value, checksum);
  return writePublishDirectory(metadata, content);
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a Reef registry client.
 *
 * Connects to The Reef static site (GitHub Pages) for skill discovery
 * and management. Caches the catalog in memory with configurable TTL.
 * Falls back gracefully to stale cache when the registry is unavailable.
 */
export function createReefRegistry(
  registryOptions?: ReefRegistryOptions,
): ReefRegistry {
  const baseUrl = registryOptions?.baseUrl ?? DEFAULT_BASE_URL;
  const cacheTtlMs = registryOptions?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const fetchFn = registryOptions?.fetchFn ?? globalThis.fetch;
  const cache: CatalogCache = { catalog: null, fetchedAt: 0 };

  return {
    search: (searchOptions) =>
      executeSearch({ searchOptions, baseUrl, cache, cacheTtlMs, fetchFn }),
    install: (name, targetDir) =>
      executeInstall({ name, targetDir, baseUrl, cache, cacheTtlMs, fetchFn }),
    checkUpdates: (installedSkills) =>
      executeCheckUpdates({
        installedSkills,
        baseUrl,
        cache,
        cacheTtlMs,
        fetchFn,
      }),
    publish: executePublish,
  };
}
