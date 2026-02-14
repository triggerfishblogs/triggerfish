/**
 * Derives the Triggerfish version from git tags.
 *
 * Runs `git describe --tags --abbrev=0` at module load time.
 * For compiled binaries, the compile task embeds the version first.
 *
 * @module
 */

/** Resolve the current version from the nearest git tag. */
function resolveVersion(): string {
  try {
    const cmd = new Deno.Command("git", {
      args: ["describe", "--tags", "--abbrev=0"],
      stdout: "piped",
      stderr: "null",
    });
    const output = cmd.outputSync();
    if (output.success) {
      const tag = new TextDecoder().decode(output.stdout).trim();
      return tag.startsWith("v") ? tag.slice(1) : tag;
    }
  } catch {
    // git not available (compiled binary without git in PATH)
  }
  return "unknown";
}

/** Current Triggerfish version (e.g. "0.1.29"). */
export const VERSION: string = resolveVersion();
