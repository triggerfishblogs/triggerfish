#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Reef Registry: Index Builder
 *
 * Walks the skills/ and plugins/ directories, parses submissions, and
 * generates the static index files served by GitHub Pages.
 *
 * Generated files:
 *   index/catalog.json              — Full searchable skill catalog
 *   index/tags.json                 — Tag → skill name mapping
 *   index/categories.json           — Category → skill name mapping
 *   plugins/index/catalog.json      — Full searchable plugin catalog
 *
 * Usage: deno run --allow-read --allow-write scripts/build-index.ts
 */

import { parse as parseYaml } from "@std/yaml";
import { join } from "@std/path";

interface SkillCatalogEntry {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly tags: readonly string[];
  readonly category: string;
  readonly classificationCeiling: string;
  readonly checksum: string;
  readonly publishedAt: string;
}

interface SkillCatalog {
  readonly entries: readonly SkillCatalogEntry[];
  readonly generatedAt: string;
}

interface PluginCatalogEntry {
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

interface PluginCatalog {
  readonly entries: readonly PluginCatalogEntry[];
  readonly generatedAt: string;
}

/** Compute SHA-256 hex digest of content. */
async function computeChecksum(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Extract YAML frontmatter from SKILL.md content. */
function extractFrontmatter(
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

/** Check if a directory exists. */
async function dirExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

/** Scan all skill directories and build catalog entries. */
async function scanSkills(
  skillsDir: string,
): Promise<SkillCatalogEntry[]> {
  const entries: SkillCatalogEntry[] = [];
  if (!(await dirExists(skillsDir))) return entries;

  for await (const skillEntry of Deno.readDir(skillsDir)) {
    if (!skillEntry.isDirectory) continue;
    const skillName = skillEntry.name;
    const skillNameDir = join(skillsDir, skillName);

    for await (const versionEntry of Deno.readDir(skillNameDir)) {
      if (!versionEntry.isDirectory) continue;
      const version = versionEntry.name;
      const versionDir = join(skillNameDir, version);
      const skillMdPath = join(versionDir, "SKILL.md");

      let content: string;
      try {
        content = await Deno.readTextFile(skillMdPath);
      } catch {
        console.warn(`Skipping skill ${skillName}/${version}: no SKILL.md`);
        continue;
      }

      const raw = extractFrontmatter(content);
      if (!raw || !raw.name) {
        console.warn(
          `Skipping skill ${skillName}/${version}: invalid frontmatter`,
        );
        continue;
      }

      const checksum = await computeChecksum(content);
      const metadataPath = join(versionDir, "metadata.json");
      let publishedAt = new Date().toISOString();
      try {
        const existing = JSON.parse(await Deno.readTextFile(metadataPath));
        if (existing.publishedAt) publishedAt = existing.publishedAt;
      } catch {
        // No existing metadata, use current time
      }

      const tags = Array.isArray(raw.tags) ? (raw.tags as string[]) : [];
      const entry: SkillCatalogEntry = {
        name: String(raw.name),
        version: String(raw.version ?? version),
        description: String(raw.description ?? ""),
        author: String(raw.author ?? "unknown"),
        tags,
        category: String(raw.category ?? "uncategorized"),
        classificationCeiling: String(
          raw.classification_ceiling ?? "PUBLIC",
        ),
        checksum,
        publishedAt,
      };
      entries.push(entry);

      // Write/update metadata.json
      const metadata = {
        ...entry,
        requiresTools: raw.requires_tools ?? null,
        networkDomains: raw.network_domains ?? null,
      };
      await Deno.writeTextFile(
        metadataPath,
        JSON.stringify(metadata, null, 2),
      );
    }
  }

  return entries;
}

/** Scan all plugin directories and build catalog entries. */
async function scanPlugins(
  pluginsDir: string,
): Promise<PluginCatalogEntry[]> {
  const entries: PluginCatalogEntry[] = [];
  if (!(await dirExists(pluginsDir))) return entries;

  for await (const pluginEntry of Deno.readDir(pluginsDir)) {
    if (!pluginEntry.isDirectory) continue;
    const pluginName = pluginEntry.name;
    if (pluginName === "index") continue;
    const pluginNameDir = join(pluginsDir, pluginName);

    for await (const versionEntry of Deno.readDir(pluginNameDir)) {
      if (!versionEntry.isDirectory) continue;
      const version = versionEntry.name;
      const versionDir = join(pluginNameDir, version);
      const metadataPath = join(versionDir, "metadata.json");

      let metadataContent: string;
      try {
        metadataContent = await Deno.readTextFile(metadataPath);
      } catch {
        console.warn(
          `Skipping plugin ${pluginName}/${version}: no metadata.json`,
        );
        continue;
      }

      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(metadataContent);
      } catch {
        console.warn(
          `Skipping plugin ${pluginName}/${version}: invalid metadata.json`,
        );
        continue;
      }

      // Verify mod.ts exists
      const modPath = join(versionDir, "mod.ts");
      let modContent: string;
      try {
        modContent = await Deno.readTextFile(modPath);
      } catch {
        console.warn(
          `Skipping plugin ${pluginName}/${version}: no mod.ts`,
        );
        continue;
      }

      const checksum = await computeChecksum(modContent);
      const tags = Array.isArray(raw.tags) ? (raw.tags as string[]) : [];
      const declaredEndpoints = Array.isArray(raw.declaredEndpoints)
        ? (raw.declaredEndpoints as string[])
        : [];

      const entry: PluginCatalogEntry = {
        name: String(raw.name ?? pluginName),
        version: String(raw.version ?? version),
        description: String(raw.description ?? ""),
        author: String(raw.author ?? "unknown"),
        classification: String(raw.classification ?? "INTERNAL"),
        trust: String(raw.trust ?? "sandboxed"),
        tags,
        checksum,
        publishedAt: String(
          raw.publishedAt ?? new Date().toISOString(),
        ),
        declaredEndpoints,
      };
      entries.push(entry);

      // Update metadata with computed checksum
      const updatedMetadata = { ...raw, checksum };
      await Deno.writeTextFile(
        metadataPath,
        JSON.stringify(updatedMetadata, null, 2),
      );
    }
  }

  return entries;
}

/** Build the tag index from catalog entries. */
function buildTagIndex(
  entries: readonly SkillCatalogEntry[],
): Record<string, string[]> {
  const tags: Record<string, string[]> = {};
  for (const entry of entries) {
    for (const tag of entry.tags) {
      if (!tags[tag]) tags[tag] = [];
      if (!tags[tag].includes(entry.name)) {
        tags[tag].push(entry.name);
      }
    }
  }
  return tags;
}

/** Build the category index from catalog entries. */
function buildCategoryIndex(
  entries: readonly SkillCatalogEntry[],
): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  for (const entry of entries) {
    const cat = entry.category;
    if (!categories[cat]) categories[cat] = [];
    if (!categories[cat].includes(entry.name)) {
      categories[cat].push(entry.name);
    }
  }
  return categories;
}

// ─── Main ────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const repoRoot = Deno.cwd();
  const skillsDir = join(repoRoot, "skills");
  const pluginsDir = join(repoRoot, "plugins");
  const indexDir = join(repoRoot, "index");
  const pluginIndexDir = join(repoRoot, "plugins", "index");

  // ── Skills ──

  console.log("Scanning skills directory...");
  const skillEntries = await scanSkills(skillsDir);
  console.log(`Found ${skillEntries.length} skill version(s)`);

  await Deno.mkdir(indexDir, { recursive: true });

  const skillCatalog: SkillCatalog = {
    entries: skillEntries,
    generatedAt: new Date().toISOString(),
  };
  await Deno.writeTextFile(
    join(indexDir, "catalog.json"),
    JSON.stringify(skillCatalog, null, 2),
  );

  const tags = buildTagIndex(skillEntries);
  await Deno.writeTextFile(
    join(indexDir, "tags.json"),
    JSON.stringify(tags, null, 2),
  );

  const categories = buildCategoryIndex(skillEntries);
  await Deno.writeTextFile(
    join(indexDir, "categories.json"),
    JSON.stringify(categories, null, 2),
  );

  // ── Plugins ──

  console.log("Scanning plugins directory...");
  const pluginEntries = await scanPlugins(pluginsDir);
  console.log(`Found ${pluginEntries.length} plugin version(s)`);

  await Deno.mkdir(pluginIndexDir, { recursive: true });

  const pluginCatalog: PluginCatalog = {
    entries: pluginEntries,
    generatedAt: new Date().toISOString(),
  };
  await Deno.writeTextFile(
    join(pluginIndexDir, "catalog.json"),
    JSON.stringify(pluginCatalog, null, 2),
  );

  // ── Summary ──

  console.log("\nIndex files generated:");
  console.log(`  index/catalog.json:           ${skillEntries.length} skills`);
  console.log(`  index/tags.json:              ${Object.keys(tags).length} tags`);
  console.log(
    `  index/categories.json:        ${Object.keys(categories).length} categories`,
  );
  console.log(
    `  plugins/index/catalog.json:   ${pluginEntries.length} plugins`,
  );
}
