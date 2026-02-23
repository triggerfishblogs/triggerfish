/**
 * Platform-specific utilities for the CLI.
 *
 * Handles Windows ANSI escape sequence enabling and gateway HTTP probing.
 *
 * @module
 */

// ─── Gateway probe ────────────────────────────────────────────────────────────

/**
 * Probe the gateway HTTP endpoint to check if it's alive.
 */
export async function probeGateway(port = 18789): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ─── Windows ANSI ─────────────────────────────────────────────────────────────

/**
 * Enable ANSI escape sequence processing on Windows.
 *
 * Windows PowerShell 5.1 and legacy conhost do not interpret ANSI escape
 * codes by default. This calls SetConsoleMode with
 * ENABLE_VIRTUAL_TERMINAL_PROCESSING to enable them. Silently ignored on
 * non-Windows platforms or if the call fails.
 */
export function enableWindowsAnsi(): void {
  if (Deno.build.os !== "windows") return;

  try {
    const kernel32 = Deno.dlopen("kernel32.dll", {
      GetStdHandle: { parameters: ["i32"], result: "pointer" },
      GetConsoleMode: { parameters: ["pointer", "buffer"], result: "i32" },
      SetConsoleMode: { parameters: ["pointer", "u32"], result: "i32" },
    });

    const STD_OUTPUT_HANDLE = -11;
    const ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004;

    const handle = kernel32.symbols.GetStdHandle(STD_OUTPUT_HANDLE);
    const modeBuffer = new Uint32Array(1);
    kernel32.symbols.GetConsoleMode(handle, modeBuffer);
    kernel32.symbols.SetConsoleMode(
      handle,
      modeBuffer[0] | ENABLE_VIRTUAL_TERMINAL_PROCESSING,
    );
    kernel32.close();
  } catch {
    // VT processing not available — colors will degrade gracefully
  }
}
