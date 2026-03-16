use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Tauri command invoked from the Svelte frontend to show a native OS notification.
///
/// Called via `invoke("show_native_notification", { title, body })` when the
/// Tidepool app detects `window.__TAURI__`.
#[tauri::command]
pub fn show_native_notification(
    app: AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("Notification dispatch failed: {e}"))
}
