/**
 * GitHub release discovery: fetch latest release metadata from the GitHub API.
 * @module
 */

const GITHUB_REPO = "greghavens/triggerfish";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;

/** Metadata about a GitHub release. */
export interface ReleaseMetadata {
  readonly tag: string;
  readonly downloadUrl: string;
  readonly checksumsUrl?: string;
  /** Tauri native UI binary URLs (absent if not in this release). */
  readonly tauri?: TauriReleaseAssets;
}

/**
 * Resolve the platform-specific asset name for the current OS and architecture.
 */
export function resolveAssetName(): string {
  const os = Deno.build.os === "darwin" ? "macos" : Deno.build.os;
  const arch = Deno.build.arch === "aarch64" ? "arm64" : "x64";
  const ext = Deno.build.os === "windows" ? ".exe" : "";
  return `triggerfish-${os}-${arch}${ext}`;
}

/** Shape of the GitHub releases/latest JSON response. */
interface GitHubReleasePayload {
  readonly tag_name: string;
  readonly assets: readonly {
    readonly name: string;
    readonly browser_download_url: string;
  }[];
}

/**
 * Resolve the platform-specific asset name for the Tauri native UI binary.
 */
export function resolveTauriAssetName(): string {
  const os = Deno.build.os === "darwin" ? "macos" : Deno.build.os;
  const arch = Deno.build.arch === "aarch64" ? "arm64" : "x64";
  const ext = Deno.build.os === "windows" ? ".exe" : "";
  return `triggerfish-tidepool-${os}-${arch}${ext}`;
}

/** URLs for optional Tauri native UI binary in a release. */
export interface TauriReleaseAssets {
  readonly binaryUrl: string;
  readonly checksumsUrl?: string;
}

/** Extract matching asset URLs from a GitHub release payload. */
function extractReleaseAssets(
  release: GitHubReleasePayload,
): { binaryUrl: string; checksumsUrl?: string } | null {
  const assetName = resolveAssetName();
  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) return null;
  const checksums = release.assets.find((a) => a.name === "SHA256SUMS.txt");
  return {
    binaryUrl: asset.browser_download_url,
    checksumsUrl: checksums?.browser_download_url,
  };
}

/** Extract Tauri native UI asset URLs from a GitHub release payload. */
function extractTauriAssets(
  release: GitHubReleasePayload,
): TauriReleaseAssets | null {
  const assetName = resolveTauriAssetName();
  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) return null;
  const checksums = release.assets.find((a) =>
    a.name === "SHA256SUMS-tauri.txt"
  );
  return {
    binaryUrl: asset.browser_download_url,
    checksumsUrl: checksums?.browser_download_url,
  };
}

/** Convert a GitHub release payload into ReleaseMetadata or an error. */
function buildReleaseMetadata(
  release: GitHubReleasePayload,
): { metadata: ReleaseMetadata } | { error: string } {
  const assets = extractReleaseAssets(release);
  if (!assets) {
    const assetName = resolveAssetName();
    return {
      error:
        `No binary for this platform (${assetName}) in release ${release.tag_name}`,
    };
  }
  const tauri = extractTauriAssets(release) ?? undefined;
  return {
    metadata: {
      tag: release.tag_name,
      downloadUrl: assets.binaryUrl,
      checksumsUrl: assets.checksumsUrl,
      tauri,
    },
  };
}

/** Fetch the latest release metadata from GitHub. */
export async function fetchLatestRelease(): Promise<
  { metadata: ReleaseMetadata } | { error: string }
> {
  try {
    const resp = await fetch(`${GITHUB_API}/releases/latest`, {
      headers: { "User-Agent": "triggerfish-updater" },
    });
    if (!resp.ok) {
      return { error: `Failed to check for updates: HTTP ${resp.status}` };
    }
    const release = await resp.json() as GitHubReleasePayload;
    return buildReleaseMetadata(release);
  } catch (e) {
    return { error: `Failed to check for updates: ${e}` };
  }
}
