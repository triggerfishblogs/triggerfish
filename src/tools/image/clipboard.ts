/**
 * OS clipboard image reader.
 *
 * Detects the display server / platform and uses the appropriate
 * clipboard tool to read image data:
 * - Wayland: `wl-paste --type image/png` (fallback `image/jpeg`)
 * - X11: `xclip -selection clipboard -target image/png -o`
 * - macOS: `pngpaste /dev/stdout`
 *
 * Returns a Result with the raw image bytes and detected MIME type.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";

/** Image data read from the clipboard. */
export interface ClipboardImage {
  readonly data: Uint8Array;
  readonly mimeType: string;
}

/** PNG magic bytes: \x89PNG\r\n\x1a\n */
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

/** JPEG magic bytes: \xFF\xD8\xFF */
const JPEG_MAGIC = new Uint8Array([0xFF, 0xD8, 0xFF]);

/**
 * Validate image data by checking magic bytes.
 *
 * @param data - Raw bytes to validate
 * @returns Detected MIME type or null if not a recognized image
 */
export function detectImageType(data: Uint8Array): string | null {
  if (data.length < 4) return null;

  if (
    data.length >= PNG_MAGIC.length &&
    data.subarray(0, PNG_MAGIC.length).every((b, i) => b === PNG_MAGIC[i])
  ) {
    return "image/png";
  }

  if (
    data.length >= JPEG_MAGIC.length &&
    data.subarray(0, JPEG_MAGIC.length).every((b, i) => b === JPEG_MAGIC[i])
  ) {
    return "image/jpeg";
  }

  return null;
}

/** Detect the clipboard command to use for the current platform. */
interface ClipboardCommand {
  readonly cmd: string[];
  readonly label: string;
}

/**
 * Get clipboard commands ordered by preference for the current platform.
 * Returns multiple commands to try in order (first success wins).
 */
function getClipboardCommands(): readonly ClipboardCommand[] {
  const os = Deno.build.os;

  if (os === "darwin") {
    return [
      { cmd: ["pngpaste", "/dev/stdout"], label: "pngpaste" },
    ];
  }

  // Linux: try Wayland first, then X11
  const waylandDisplay = Deno.env.get("WAYLAND_DISPLAY");
  const display = Deno.env.get("DISPLAY");

  const commands: ClipboardCommand[] = [];

  if (waylandDisplay) {
    commands.push(
      { cmd: ["wl-paste", "--type", "image/png"], label: "wl-paste (png)" },
      { cmd: ["wl-paste", "--type", "image/jpeg"], label: "wl-paste (jpeg)" },
    );
  }

  if (display) {
    commands.push(
      { cmd: ["xclip", "-selection", "clipboard", "-target", "image/png", "-o"], label: "xclip (png)" },
      { cmd: ["xclip", "-selection", "clipboard", "-target", "image/jpeg", "-o"], label: "xclip (jpeg)" },
    );
  }

  if (commands.length === 0) {
    // Fallback: try Wayland and X11 anyway
    commands.push(
      { cmd: ["wl-paste", "--type", "image/png"], label: "wl-paste (png)" },
      { cmd: ["xclip", "-selection", "clipboard", "-target", "image/png", "-o"], label: "xclip (png)" },
    );
  }

  return commands;
}

/**
 * Try to run a clipboard command and return the output.
 *
 * @param cmd - Command and arguments to run
 * @returns Raw stdout bytes or null on failure
 */
async function tryCommand(cmd: string[]): Promise<Uint8Array | null> {
  try {
    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: "piped",
      stderr: "piped",
    });

    const result = await process.output();
    if (!result.success || result.stdout.length === 0) {
      return null;
    }
    return result.stdout;
  } catch {
    return null;
  }
}

/**
 * Read an image from the system clipboard.
 *
 * Tries platform-appropriate clipboard tools in order. Validates
 * the result with magic byte detection.
 *
 * @returns Result with ClipboardImage on success, error string on failure
 */
export async function readClipboardImage(): Promise<Result<ClipboardImage, string>> {
  const commands = getClipboardCommands();

  for (const { cmd, label: _label } of commands) {
    const data = await tryCommand(cmd);
    if (!data) continue;

    const mimeType = detectImageType(data);
    if (!mimeType) {
      // Got data but it's not a recognized image — skip to next command
      continue;
    }

    return {
      ok: true,
      value: { data, mimeType },
    };
  }

  return {
    ok: false,
    error: "No image found in clipboard. Copy an image first, then press Ctrl+V.",
  };
}
