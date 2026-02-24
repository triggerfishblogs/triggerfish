/**
 * GitHub release notes fetcher for version range queries.
 *
 * Fetches releases from the GitHub API and filters them to a
 * specified version range for changelog display.
 *
 * @module
 */

import type { Result } from "../../../core/types/classification.ts";

const GITHUB_REPO = "greghavens/triggerfish";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;

/** Maximum number of API pages to fetch (30 releases per page). */
const MAX_PAGES = 4;

/** A single release note entry from GitHub. */
export interface ReleaseNote {
  readonly tag: string;
  readonly name: string;
  readonly body: string;
  readonly publishedAt: string;
  readonly htmlUrl: string;
}

/** A range of release notes between two versions. */
export interface ChangelogRange {
  readonly from: string;
  readonly to: string;
  readonly releases: readonly ReleaseNote[];
}

/** Shape of the GitHub releases list JSON response. */
interface GitHubReleaseListItem {
  readonly tag_name: string;
  readonly name: string | null;
  readonly body: string | null;
  readonly published_at: string | null;
  readonly html_url: string;
  readonly draft: boolean;
  readonly prerelease: boolean;
}

/**
 * Parse a semver version tag into numeric components.
 *
 * Strips an optional leading `v` prefix and parses major.minor.patch.
 * Returns null if the tag cannot be parsed.
 */
export function parseSemver(
  tag: string,
): { major: number; minor: number; patch: number } | null {
  const cleaned = tag.startsWith("v") ? tag.slice(1) : tag;
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/**
 * Compare two version tags using semver ordering.
 *
 * Returns negative if a < b, positive if a > b, zero if equal.
 * Non-parseable tags sort after valid tags.
 */
export function compareVersionTags(a: string, b: string): number {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  if (av.major !== bv.major) return av.major - bv.major;
  if (av.minor !== bv.minor) return av.minor - bv.minor;
  return av.patch - bv.patch;
}

/**
 * Normalize a version string to include the `v` prefix.
 *
 * Accepts both `0.3.3` and `v0.3.3` formats.
 */
export function normalizeVersionTag(tag: string): string {
  return tag.startsWith("v") ? tag : `v${tag}`;
}

/** Convert a GitHub release list item to a ReleaseNote. */
function toReleaseNote(item: GitHubReleaseListItem): ReleaseNote {
  return {
    tag: item.tag_name,
    name: item.name ?? item.tag_name,
    body: item.body ?? "",
    publishedAt: item.published_at ?? "",
    htmlUrl: item.html_url,
  };
}

/**
 * Fetch all releases from GitHub, paginated up to MAX_PAGES.
 *
 * Returns published, non-draft releases sorted by version descending.
 */
export async function fetchAllReleases(): Promise<
  Result<readonly ReleaseNote[], string>
> {
  const releases: ReleaseNote[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const resp = await fetch(
        `${GITHUB_API}/releases?per_page=30&page=${page}`,
        { headers: { "User-Agent": "triggerfish-updater" } },
      );
      if (!resp.ok) {
        return {
          ok: false,
          error: `GitHub API returned HTTP ${resp.status} fetching releases`,
        };
      }
      const items = (await resp.json()) as GitHubReleaseListItem[];
      if (items.length === 0) break;

      for (const item of items) {
        if (item.draft) continue;
        releases.push(toReleaseNote(item));
      }

      if (items.length < 30) break;
    } catch (err) {
      return {
        ok: false,
        error: `Failed to fetch releases: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }

  releases.sort((a, b) => compareVersionTags(a.tag, b.tag));
  return { ok: true, value: releases };
}

/**
 * Fetch release notes between two version tags.
 *
 * The `from` version is exclusive (not included) and the `to` version
 * is inclusive. Both accept formats with or without the `v` prefix.
 *
 * @param from - Lower bound version (exclusive).
 * @param to - Upper bound version (inclusive).
 * @returns Releases in the range, sorted oldest to newest.
 */
export async function fetchChangelogRange(
  from: string,
  to: string,
): Promise<Result<ChangelogRange, string>> {
  const fromTag = normalizeVersionTag(from);
  const toTag = normalizeVersionTag(to);

  const allResult = await fetchAllReleases();
  if (!allResult.ok) return allResult;

  const filtered = allResult.value.filter((r) => {
    const cmpFrom = compareVersionTags(r.tag, fromTag);
    const cmpTo = compareVersionTags(r.tag, toTag);
    return cmpFrom > 0 && cmpTo <= 0;
  });

  return {
    ok: true,
    value: {
      from: fromTag,
      to: toTag,
      releases: filtered,
    },
  };
}
