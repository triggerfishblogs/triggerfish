/**
 * Tauri integration bridge for native OS notifications.
 *
 * When the Tidepool UI runs inside the Tauri native shell,
 * `window.__TAURI__` is available and we can invoke Rust commands
 * for native notifications instead of web Notification API.
 */

/** Whether the app is running inside the Tauri native shell. */
export function isNativeApp(): boolean {
  // deno-lint-ignore no-explicit-any
  return typeof (globalThis as any).__TAURI__ !== "undefined";
}

/**
 * Show a native OS notification via Tauri invoke.
 *
 * Falls back silently if the invoke fails (e.g., permission denied).
 */
export async function showNativeNotification(
  title: string,
  body: string,
): Promise<void> {
  if (!isNativeApp()) return;
  try {
    // deno-lint-ignore no-explicit-any
    const { invoke } = (globalThis as any).__TAURI__.core;
    await invoke("show_native_notification", { title, body });
  } catch (err: unknown) {
    console.warn("Native notification dispatch failed", err);
  }
}
