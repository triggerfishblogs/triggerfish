use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tokio::time::{interval, Duration};

use crate::session_key;

/// Shared state for the health poller.
struct HealthState {
    last_known_key: Option<String>,
    was_online: bool,
}

/// Spawn the async health poller that checks gateway connectivity every 5 seconds.
///
/// On reconnection (offline → online), re-reads the session key file.
/// If the key has changed (daemon restart), reloads the webview with the new URL.
pub fn spawn_health_poller(app: AppHandle) {
    let state = Mutex::new(HealthState {
        last_known_key: session_key::read_session_key().ok(),
        was_online: false,
    });

    tauri::async_runtime::spawn(async move {
        let mut tick = interval(Duration::from_secs(5));
        loop {
            tick.tick().await;
            poll_once(&app, &state).await;
        }
    });
}

/// Execute a single health poll cycle.
async fn poll_once(app: &AppHandle, state: &Mutex<HealthState>) {
    let current_key = {
        let guard = state.lock().unwrap();
        guard.last_known_key.clone().unwrap_or_default()
    };

    let result = probe_gateway(&current_key).await;

    match result {
        ProbeResult::Ok => handle_online(app, state),
        ProbeResult::AuthFailed => handle_auth_failed(app, state),
        ProbeResult::Unreachable => handle_offline(state),
    }
}

/// Gateway responded 200.
fn handle_online(app: &AppHandle, state: &Mutex<HealthState>) {
    let mut guard = state.lock().unwrap();
    let was_offline = !guard.was_online;
    guard.was_online = true;

    if was_offline {
        if let Ok(fresh_key) = session_key::read_session_key() {
            let key_changed = guard.last_known_key.as_deref() != Some(&fresh_key);
            guard.last_known_key = Some(fresh_key.clone());
            if key_changed {
                reload_webview(app, &fresh_key);
            }
        }
    }
}

/// Gateway responded 401/403 — key is stale.
fn handle_auth_failed(app: &AppHandle, state: &Mutex<HealthState>) {
    let mut guard = state.lock().unwrap();
    if let Ok(fresh_key) = session_key::read_session_key() {
        guard.last_known_key = Some(fresh_key.clone());
        guard.was_online = true;
        reload_webview(app, &fresh_key);
    } else {
        guard.was_online = false;
    }
}

/// Gateway is unreachable.
fn handle_offline(state: &Mutex<HealthState>) {
    let mut guard = state.lock().unwrap();
    guard.was_online = false;
}

/// Reload the main webview with a new session key URL.
fn reload_webview(app: &AppHandle, key: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let url = format!("http://127.0.0.1:18790?key={}", key);
        let js_url = serde_json::to_string(&url).unwrap_or_default();
        let _ = window.eval(&format!("window.location.replace({})", js_url));
    }
}

enum ProbeResult {
    Ok,
    AuthFailed,
    Unreachable,
}

/// HTTP GET the gateway with Bearer token auth and classify the response.
async fn probe_gateway(key: &str) -> ProbeResult {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build();

    let client = match client {
        Ok(c) => c,
        Err(_) => return ProbeResult::Unreachable,
    };

    match client
        .get("http://127.0.0.1:18790")
        .header("Authorization", format!("Bearer {}", key))
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if status == 401 || status == 403 {
                ProbeResult::AuthFailed
            } else if resp.status().is_success() {
                ProbeResult::Ok
            } else {
                ProbeResult::Unreachable
            }
        }
        Err(_) => ProbeResult::Unreachable,
    }
}
