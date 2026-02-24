#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Reef Registry: Index Builder
 *
 * Walks the skills/ directory, parses all SKILL.md files, and generates
 * the static index files served by GitHub Pages.
 *
 * Generated files:
 *   index/catalog.json     — Full searchable catalog
 *   index/tags.json        — Tag → skill name mapping
 *   index/categories.json  — Category → skill name mapping
 *
 * Usage: deno run --allow-read --allow-write scripts/build-index.ts
 */

import { parse as parseYaml } from "https://deno.land/std/yaml/mod.ts";
import { join } from "https://deno.land/std/path/mod.ts";

interface CatalogEntry {
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

interface Catalog {
  readonly entries: readonly CatalogEntry[];
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

/** Scan all skill directories and build catalog entries. */
async function scanSkills(skillsDir: string): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];

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
        console.warn(`Skipping ${skillName}/${version}: no SKILL.md`);
        continue;
      }

      const raw = extractFrontmatter(content);
      if (!raw || !raw.name) {
        console.warn(`Skipping ${skillName}/${version}: invalid frontmatter`);
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
      const entry: CatalogEntry = {
        name: String(raw.name),
        version: String(raw.version ?? version),
        description: String(raw.description ?? ""),
        author: String(raw.author ?? "unknown"),
        tags,
        category: String(raw.category ?? "uncategorized"),
        classificationCeiling: String(raw.classification_ceiling ?? "PUBLIC"),
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
      await Deno.writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));
    }
  }

  return entries;
}

/** Build the tag index from catalog entries. */
function buildTagIndex(entries: readonly CatalogEntry[]): Record<string, string[]> {
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
function buildCategoryIndex(entries: readonly CatalogEntry[]): Record<string, string[]> {
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
  const indexDir = join(repoRoot, "index");

  console.log("Scanning skills directory...");
  const entries = await scanSkills(skillsDir);
  console.log(`Found ${entries.length} skill version(s)`);

  await Deno.mkdir(indexDir, { recursive: true });

  const catalog: Catalog = {
    entries,
    generatedAt: new Date().toISOString(),
  };
  await Deno.writeTextFile(
    join(indexDir, "catalog.json"),
    JSON.stringify(catalog, null, 2),
  );

  const tags = buildTagIndex(entries);
  await Deno.writeTextFile(
    join(indexDir, "tags.json"),
    JSON.stringify(tags, null, 2),
  );

  const categories = buildCategoryIndex(entries);
  await Deno.writeTextFile(
    join(indexDir, "categories.json"),
    JSON.stringify(categories, null, 2),
  );

  console.log("Index files generated:");
  console.log(`  catalog.json:    ${entries.length} entries`);
  console.log(`  tags.json:       ${Object.keys(tags).length} tags`);
  console.log(`  categories.json: ${Object.keys(categories).length} categories`);
}
