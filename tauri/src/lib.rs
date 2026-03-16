mod health;
mod notifications;
mod session_key;
mod tray;

use tauri::{image::Image, Manager};

/// Embedded HTML shown while the gateway is unreachable.
const CONNECTING_HTML: &str = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Triggerfish Tidepool</title>
<style>
  body { margin:0; display:flex; align-items:center; justify-content:center;
         height:100vh; background:#0a0e17; color:#7ec8e3; font-family:system-ui; }
  .container { text-align:center; }
  h2 { font-weight:400; margin-bottom:0.5em; }
  p { color:#4a5568; font-size:0.9em; }
  .spinner { width:32px; height:32px; border:3px solid #1a2332;
             border-top-color:#7ec8e3; border-radius:50%;
             animation:spin 1s linear infinite; margin:1em auto; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Connecting to Triggerfish…</h2>
    <p>Waiting for the gateway on 127.0.0.1:18790</p>
  </div>
</body>
</html>"#;

/// Build and run the Tauri application.
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            notifications::show_native_notification,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main")
                .expect("main window not found");

            // Try to load the gateway URL with the session key.
            // If the key is unavailable, show the connecting page.
            match session_key::read_session_key() {
                Ok(key) => {
                    let url = format!("http://127.0.0.1:18790?key={}", key);
                    window.eval(&format!(
                        "window.location.replace('{}')",
                        url
                    ))?;
                }
                Err(_) => {
                    window.eval(&format!(
                        "document.open(); document.write({}); document.close();",
                        serde_json::to_string(CONNECTING_HTML).unwrap_or_default()
                    ))?;
                }
            }

            let icon = Image::from_bytes(include_bytes!("../icons/icon.png"))?;
            window.set_icon(icon)?;

            // Set up the system tray.
            tray::create_tray(app)?;

            // Start the health poller for reconnection and tray status.
            let app_handle = app.handle().clone();
            health::spawn_health_poller(app_handle);

            Ok(())
        });

    builder
        .run(tauri::generate_context!())
        .expect("failed to run Triggerfish Tidepool");
}
