import { mount } from "svelte";
import App from "./App.svelte";
import { connect, onTopic } from "./lib/stores/websocket.svelte.js";
import { resolveScreenFromHash } from "./lib/stores/nav.svelte.js";
import { isNativeApp, showNativeNotification } from "./lib/tauri.js";
import "./app.css";

// Resolve initial screen from URL hash
resolveScreenFromHash();

// Listen for hash changes
window.addEventListener("hashchange", resolveScreenFromHash);

// Mount the app
mount(App, { target: document.getElementById("app")! });

// Bridge notifications to native OS when running inside Tauri
if (isNativeApp()) {
  onTopic("notification", (msg) => {
    const title = (msg.title as string) ?? "Triggerfish";
    const body = (msg.body as string) ?? "";
    showNativeNotification(title, body);
  });
}

// Connect WebSocket
connect();
